"use client"

import * as React from "react"
import { format, startOfYear, endOfYear, subYears, differenceInDays, subDays } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { KPICards } from "@/components/analytics/KPICards"
// Lazy load charts for better code splitting
import dynamic from "next/dynamic"

const DisputesOverTimeChart = dynamic(
  () => import("@/components/analytics/DisputesOverTimeChart").then((mod) => ({ default: mod.DisputesOverTimeChart })),
  { ssr: false }
)

const DisputesByStatusChart = dynamic(
  () => import("@/components/analytics/DisputesByStatusChart").then((mod) => ({ default: mod.DisputesByStatusChart })),
  { ssr: false }
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface OverviewData {
  total: number
  open: number
  resolved: number
  winRate: number
  totalAmountByCurrency: Record<string, number>
  avgResolutionTime: number
  thisMonthDisputes: number
  lastMonthDisputes: number
  monthOverMonthChange: number
}

interface TimeSeriesData {
  date: string
  total: number
  resolved: number
}

interface StatusData {
  status: string
  label: string
  count: number
}

export default function AnalyticsPage() {
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [accountId, setAccountId] = React.useState<string>("all")
  const [days, setDays] = React.useState<string>("30")
  const [accounts, setAccounts] = React.useState<
    Array<{ id: string; account_name: string }>
  >([])

  const [overviewData, setOverviewData] =
    React.useState<OverviewData | null>(null)
  const [timeSeriesData, setTimeSeriesData] = React.useState<
    TimeSeriesData[] | null
  >(null)
  const [statusData, setStatusData] = React.useState<StatusData[] | null>(null)

  const [overviewLoading, setOverviewLoading] = React.useState(true)
  const [timeSeriesLoading, setTimeSeriesLoading] = React.useState(true)
  const [statusLoading, setStatusLoading] = React.useState(true)

  // Load accounts
  React.useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch("/api/accounts")
        if (response.ok) {
          const data = await response.json()
          setAccounts(data)
        }
      } catch (error) {
        console.error("Failed to load accounts:", error)
      }
    }
    loadAccounts()
  }, [])

  // Set initial date range for default preset (30 days)
  React.useEffect(() => {
    if (days === "30" && !startDate && !endDate) {
      const today = new Date()
      const start = subDays(today, 30)
      setStartDate(start)
      setEndDate(today)
    }
  }, []) // Only run once on mount

  // Calculate effective date range based on days or custom dates
  const getEffectiveDateRange = React.useCallback(() => {
    // If custom dates are set, use them
    if (startDate && endDate) {
      return { startDate, endDate }
    }
    
    // If "this_year" is selected
    if (days === "this_year") {
      const yearStart = startOfYear(new Date())
      const today = new Date()
      return { startDate: yearStart, endDate: today }
    }
    
    // If "last_year" is selected - get previous year (Jan 1 to Dec 31 of last year)
    if (days === "last_year") {
      const today = new Date()
      const lastYear = subYears(today, 1)
      const lastYearStart = startOfYear(lastYear)
      const lastYearEnd = endOfYear(lastYear)
      return { startDate: lastYearStart, endDate: lastYearEnd }
    }
    
    // If days preset is selected (7, 30, 90)
    if (days && days !== "custom" && days !== "this_year" && days !== "last_year") {
      const daysNum = parseInt(days, 10)
      if (!isNaN(daysNum)) {
        const today = new Date()
        const start = subDays(today, daysNum)
        return { startDate: start, endDate: today }
      }
    }
    
    // No filter
    return { startDate: undefined, endDate: undefined }
  }, [days, startDate, endDate])

  // Fetch overview data
  const fetchOverview = React.useCallback(async () => {
    setOverviewLoading(true)
    try {
      const { startDate: effectiveStart, endDate: effectiveEnd } = getEffectiveDateRange()
      const params = new URLSearchParams()
      
      if (effectiveStart) {
        params.append("start_date", effectiveStart.toISOString())
      }
      if (effectiveEnd) {
        params.append("end_date", effectiveEnd.toISOString())
      }
      if (accountId && accountId !== "all") {
        params.append("account_id", accountId)
      }

      const response = await fetch(`/api/analytics/overview?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch overview")
      }
      const data = await response.json()
      setOverviewData(data)
    } catch (error) {
      console.error("Error fetching overview:", error)
    } finally {
      setOverviewLoading(false)
    }
  }, [getEffectiveDateRange, accountId])

  // Fetch time series data
  const fetchTimeSeries = React.useCallback(async () => {
    setTimeSeriesLoading(true)
    try {
      const { startDate: effectiveStart, endDate: effectiveEnd } = getEffectiveDateRange()
      const params = new URLSearchParams()
      
      // Use date range if available (for "last_year", "this_year", custom)
      if (effectiveStart && effectiveEnd) {
        params.append("start_date", effectiveStart.toISOString())
        params.append("end_date", effectiveEnd.toISOString())
      } else {
        // Fallback to days parameter
        params.append("days", days || "30")
      }
      
      if (accountId && accountId !== "all") {
        params.append("account_id", accountId)
      }

      const response = await fetch(
        `/api/analytics/disputes-over-time?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch time series")
      }
      const data = await response.json()
      setTimeSeriesData(data.data)
    } catch (error) {
      console.error("Error fetching time series:", error)
    } finally {
      setTimeSeriesLoading(false)
    }
  }, [getEffectiveDateRange, accountId, days])

  // Fetch status data
  const fetchStatus = React.useCallback(async () => {
    setStatusLoading(true)
    try {
      const { startDate: effectiveStart, endDate: effectiveEnd } = getEffectiveDateRange()
      const params = new URLSearchParams()
      
      if (effectiveStart) {
        params.append("start_date", effectiveStart.toISOString())
      }
      if (effectiveEnd) {
        params.append("end_date", effectiveEnd.toISOString())
      }
      if (accountId && accountId !== "all") {
        params.append("account_id", accountId)
      }

      const response = await fetch(
        `/api/analytics/disputes-by-status?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch status data")
      }
      const data = await response.json()
      setStatusData(data.data)
    } catch (error) {
      console.error("Error fetching status data:", error)
    } finally {
      setStatusLoading(false)
    }
  }, [getEffectiveDateRange, accountId])

  // Fetch all data when filters change
  React.useEffect(() => {
    fetchOverview()
    fetchTimeSeries()
    fetchStatus()
  }, [fetchOverview, fetchTimeSeries, fetchStatus])

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setStartDate(range.from)
      setEndDate(range.to)
    } else {
      setStartDate(undefined)
      setEndDate(undefined)
    }
  }

  const handleDaysChange = (value: string) => {
    setDays(value)
    
    // Handle "this_year" preset - set dates for display
    if (value === "this_year") {
      const yearStart = startOfYear(new Date())
      const today = new Date()
      setStartDate(yearStart)
      setEndDate(today)
    } else if (value === "last_year") {
      // Handle "last_year" preset - set dates for previous year
      const today = new Date()
      const lastYear = subYears(today, 1)
      const lastYearStart = startOfYear(lastYear)
      const lastYearEnd = endOfYear(lastYear)
      setStartDate(lastYearStart)
      setEndDate(lastYearEnd)
    } else if (value === "custom") {
      // Keep existing dates if switching to custom
      // Don't reset them
    } else {
      // For other presets (7, 30, 90), calculate and set dates for display
      const daysNum = parseInt(value, 10)
      if (!isNaN(daysNum)) {
        const today = new Date()
        const start = subDays(today, daysNum)
        setStartDate(start)
        setEndDate(today)
      } else {
        // Reset date range for invalid values
        setStartDate(undefined)
        setEndDate(undefined)
      }
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Insights and statistics for your disputes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium leading-none">Time Period</label>
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="this_year">This year</SelectItem>
              <SelectItem value="last_year">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(days === "custom" || startDate || endDate) && (
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium leading-none">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal h-10",
                    !startDate && !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate && endDate ? (
                    <>
                      {format(startDate, "MMM dd, yyyy")} -{" "}
                      {format(endDate, "MMM dd, yyyy")}
                    </>
                  ) : startDate ? (
                    format(startDate, "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: startDate,
                    to: endDate,
                  }}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium leading-none">Account</label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={overviewData} loading={overviewLoading} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DisputesOverTimeChart
          data={timeSeriesData}
          loading={timeSeriesLoading}
        />
        <DisputesByStatusChart data={statusData} loading={statusLoading} />
      </div>
    </div>
  )
}
