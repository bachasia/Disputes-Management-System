"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { DisputeFilters, type DisputeFilters as DisputeFiltersType } from "@/components/disputes"
import { DisputesTable } from "@/components/disputes"
import { Loader2, ChevronDown } from "lucide-react"
import { toast } from "sonner"

interface Dispute {
  id: string
  disputeStatus: string | null
  disputeAmount: number | null
  disputeCurrency: string | null
}

interface DisputesResponse {
  data: Dispute[]
  pagination: {
    total: number
  }
}

export default function DisputesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "viewer"
  const [filters, setFilters] = React.useState<DisputeFiltersType>({})
  const [syncLoading, setSyncLoading] = React.useState(false)
  const [syncType, setSyncType] = React.useState<"incremental" | "full">("incremental")
  const [stats, setStats] = React.useState({
    total: 0,
    open: 0,
    resolved: 0,
    totalAmount: 0,
    totalAmountByCurrency: {} as Record<string, number>,
  })

  // Fetch stats
  const fetchStats = React.useCallback(async () => {
    try {
      const params = new URLSearchParams()

      // Add filters
      if (filters.start_date) {
        params.append("start_date", filters.start_date.toISOString())
      }
      if (filters.end_date) {
        params.append("end_date", filters.end_date.toISOString())
      }
      if (filters.account_id) {
        params.append("account_id", filters.account_id)
      }
      if (filters.status) {
        params.append("status", filters.status)
      }
      if (filters.dispute_type) {
        params.append("dispute_type", filters.dispute_type)
      }
      if (filters.case_id) {
        params.append("search", filters.case_id)
      }
      if (filters.transaction_id) {
        params.append("search", filters.transaction_id)
      }
      if (filters.customer_name) {
        params.append("search", filters.customer_name)
      }
      if (filters.invoice_number) {
        params.append("search", filters.invoice_number)
      }

      // Use dedicated stats API endpoint
      const response = await fetch(`/api/disputes/stats?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()

      setStats({
        total: data.total || 0,
        open: data.open || 0,
        resolved: data.resolved || 0,
        totalAmount: data.totalAmount || 0,
        totalAmountByCurrency: data.totalAmountByCurrency || {},
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [filters])

  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSync = async (syncType: "incremental" | "90days" | "full" = "incremental") => {
    setSyncLoading(true)
    try {
      const response = await fetch("/api/disputes/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ syncType }),
      })

      if (!response.ok) {
        throw new Error("Failed to sync disputes")
      }

      const result = await response.json()
      console.log("Sync result:", result)

      // Show success message
      const syncTypeLabels = {
        incremental: "Incremental Sync",
        "90days": "90 Days Sync",
        full: "Full Sync",
      }
      const syncTypeLabel = syncTypeLabels[syncType] || "Sync"
      toast.success(`${syncTypeLabel} completed!`, {
        description: result.message || `Synced ${result.results?.totalSynced || 0} disputes`,
      })

      // Reload page after sync
      router.refresh()
      // Refetch stats
      await fetchStats()
    } catch (error) {
      console.error("Error syncing disputes:", error)
      toast.error("Failed to sync disputes", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleFilterChange = (newFilters: DisputeFiltersType) => {
    setFilters(newFilters)
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const winRate = stats.resolved > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : "0"

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">⚡ Disputes Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time dispute monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          {!isViewer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={syncLoading}
                  variant="default"
                  className="gap-2"
                >
                  {syncLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sync Now
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sync Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSync("incremental")}
                  disabled={syncLoading}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Incremental Sync</span>
                    <span className="text-xs text-muted-foreground">
                      Only sync updated disputes (faster)
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSync("90days")}
                  disabled={syncLoading}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Sync Last 90 Days</span>
                    <span className="text-xs text-muted-foreground">
                      Sync all disputes from last 90 days
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSync("full")}
                  disabled={syncLoading}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Full Sync</span>
                    <span className="text-xs text-muted-foreground">
                      Sync all disputes from beginning (no limit)
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <DisputeFilters onFilterChange={handleFilterChange} />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Disputes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All disputes in system
            </p>
          </CardContent>
        </Card>

        {/* Open Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.open.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate action
            </p>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.resolved.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {winRate}% resolution rate
            </p>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {Object.keys(stats.totalAmountByCurrency).length > 0 ? (
                Object.entries(stats.totalAmountByCurrency)
                  .sort(([a], [b]) => {
                    // Sort USD first, then alphabetically
                    if (a === "USD") return -1
                    if (b === "USD") return 1
                    return a.localeCompare(b)
                  })
                  .map(([currency, amount], index, array) => (
                    <div key={currency} className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {formatCurrency(amount, currency)}
                      </span>
                      {array.length > 1 && index < array.length - 1 && (
                        <span className="text-muted-foreground">•</span>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalAmount)}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total dispute value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <DisputesTable filters={filters} />
    </div>
  )
}
