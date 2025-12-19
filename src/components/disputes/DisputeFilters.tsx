"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DisputeFilters {
  start_date?: Date
  end_date?: Date
  case_id?: string
  transaction_id?: string
  customer_name?: string
  invoice_number?: string
  account_id?: string
  status?: string
  dispute_type?: string
}

interface DisputeFiltersProps {
  onFilterChange: (filters: DisputeFilters) => void
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "WAITING_FOR_SELLER_RESPONSE", label: "Waiting for Seller Response" },
  { value: "WAITING_FOR_BUYER_RESPONSE", label: "Waiting for Buyer Response" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "RESOLVED", label: "Resolved" },
]

const DISPUTE_TYPE_OPTIONS = [
  { value: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", label: "Not Received" },
  { value: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", label: "Not as Described" },
  { value: "UNAUTHORISED", label: "Unauthorised" },
  { value: "CREDIT_NOT_PROCESSED", label: "Credit Not Processed" },
]

export function DisputeFilters({ onFilterChange }: DisputeFiltersProps) {
  const [filters, setFilters] = React.useState<DisputeFilters>({})
  const [accounts, setAccounts] = React.useState<Array<{ id: string; account_name: string }>>([])
  const [activeFiltersCount, setActiveFiltersCount] = React.useState(0)

  // Load accounts on mount
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

  // Count active filters
  React.useEffect(() => {
    const count = Object.values(filters).filter(
      (value) => value !== undefined && value !== null && value !== ""
    ).length
    setActiveFiltersCount(count)
  }, [filters])

  // Notify parent when filters change
  React.useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const updateFilter = (key: keyof DisputeFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === "all" ? undefined : value,
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export filters:", filters)
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Search & Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="default">{activeFiltersCount} Active</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Row 1 - 5 filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Date Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Range</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.start_date && !filters.end_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.start_date && filters.end_date ? (
                  <>
                    {format(filters.start_date, "MMM dd, yyyy")} -{" "}
                    {format(filters.end_date, "MMM dd, yyyy")}
                  </>
                ) : filters.start_date ? (
                  format(filters.start_date, "MMM dd, yyyy")
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.start_date,
                  to: filters.end_date,
                }}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  if (range) {
                    updateFilter("start_date", range.from)
                    updateFilter("end_date", range.to)
                  } else {
                    updateFilter("start_date", undefined)
                    updateFilter("end_date", undefined)
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Case ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Case ID</label>
          <Input
            placeholder="Search by case ID"
            value={filters.case_id || ""}
            onChange={(e) => updateFilter("case_id", e.target.value)}
          />
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Transaction ID</label>
          <Input
            placeholder="Search by transaction ID"
            value={filters.transaction_id || ""}
            onChange={(e) => updateFilter("transaction_id", e.target.value)}
          />
        </div>

        {/* Customer Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Name</label>
          <Input
            placeholder="Search by customer name"
            value={filters.customer_name || ""}
            onChange={(e) => updateFilter("customer_name", e.target.value)}
          />
        </div>

        {/* Invoice Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Number</label>
          <Input
            placeholder="Search by invoice number"
            value={filters.invoice_number || ""}
            onChange={(e) => updateFilter("invoice_number", e.target.value)}
          />
        </div>
      </div>

      {/* Row 2 - 3 dropdowns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Payment Gateway (Account) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Gateway</label>
          <Select
            value={filters.account_id || "all"}
            onValueChange={(value) => updateFilter("account_id", value)}
          >
            <SelectTrigger>
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

        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dispute Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Dispute Type</label>
          <Select
            value={filters.dispute_type || "all"}
            onValueChange={(value) => updateFilter("dispute_type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {DISPUTE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

