"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DisputeFilters } from "./DisputeFilters"
import { StatusBadge } from "./StatusBadge"
import { ReasonBadge } from "./ReasonBadge"

interface Dispute {
  id: string
  disputeId: string
  transactionId: string | null
  invoiceNumber: string | null
  disputeAmount: number | null
  disputeCurrency: string | null
  customerEmail: string | null
  customerName: string | null
  disputeType: string | null
  disputeReason: string | null
  disputeStatus: string | null
  disputeOutcome: string | null
  disputeCreateTime: Date | null
  disputeUpdateTime: Date | null
  responseDueDate: Date | null
  description: string | null
  rawData: any
  paypalAccount: {
    id: string
    accountName: string
    email: string
    sandboxMode: boolean
  } | null
}

interface DisputesResponse {
  data: Dispute[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface DisputesTableProps {
  accountId?: string
  filters?: DisputeFilters
}


/**
 * Format amount with currency code displayed
 * Returns: { amount: "100.00", currency: "USD" }
 */
function formatAmountWithCurrency(amount: number | null, currency: string | null): { 
  amount: string
  currency: string 
} {
  if (!amount && amount !== 0) {
    return { amount: "-", currency: "" }
  }
  const currencyCode = currency || "USD"
  
  // Format number without currency symbol
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  
  return { amount: formattedAmount, currency: currencyCode }
}

/**
 * Get PayPal Resolution Center URL
 */
function getPayPalResolutionUrl(disputeId: string, sandbox: boolean) {
  const baseUrl = sandbox
    ? "https://www.sandbox.paypal.com"
    : "https://www.paypal.com"
  return `${baseUrl}/resolutioncenter/viewdispute?disputeId=${disputeId}`
}

export function DisputesTable({ accountId, filters }: DisputesTableProps) {
  const router = useRouter()
  const [disputes, setDisputes] = React.useState<Dispute[]>([])
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = React.useState(true)

  // Fetch disputes
  React.useEffect(() => {
    const fetchDisputes = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()

        // Add account filter if provided
        if (accountId) {
          params.append("account_id", accountId)
        }

        // Add filters from props
        if (filters) {
          if (filters.start_date) {
            params.append("start_date", filters.start_date.toISOString())
          }
          if (filters.end_date) {
            params.append("end_date", filters.end_date.toISOString())
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
          if (filters.account_id) {
            params.append("account_id", filters.account_id)
          }
          if (filters.status) {
            params.append("status", filters.status)
          }
          if (filters.dispute_type) {
            params.append("dispute_type", filters.dispute_type)
          }
        }

        // Add pagination
        params.append("page", pagination.page.toString())
        params.append("limit", pagination.limit.toString())

        const response = await fetch(`/api/disputes?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch disputes")
        }

        const data: DisputesResponse = await response.json()
        setDisputes(data.data)
        setPagination(data.pagination)
      } catch (error) {
        console.error("Error fetching disputes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDisputes()
  }, [accountId, filters, pagination.page, pagination.limit])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [filters, accountId])

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleRowClick = (disputeId: string) => {
    router.push(`/disputes/${disputeId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No disputes found</p>
      </div>
    )
  }

  const startItem = (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Case ID</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Transaction Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow
                  key={dispute.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(dispute.id)}
                >
                  <TableCell>
                    {dispute.disputeCreateTime
                      ? format(new Date(dispute.disputeCreateTime), "MMM dd, yyyy HH:mm")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {dispute.responseDueDate ? (
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(dispute.responseDueDate), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {dispute.paypalAccount ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
                          P
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {dispute.paypalAccount.accountName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dispute.paypalAccount.email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={getPayPalResolutionUrl(
                        dispute.disputeId,
                        dispute.paypalAccount?.sandboxMode ?? false
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      {dispute.disputeId}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {dispute.transactionId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {dispute.invoiceNumber || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {dispute.disputeCreateTime
                      ? format(new Date(dispute.disputeCreateTime), "MMM dd, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <ReasonBadge reason={dispute.disputeReason} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge 
                        status={dispute.disputeStatus} 
                        outcome={dispute.disputeOutcome}
                        rawData={dispute.rawData}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {dispute.customerEmail || dispute.customerName || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const { amount, currency } = formatAmountWithCurrency(
                        dispute.disputeAmount, 
                        dispute.disputeCurrency
                      )
                      return (
                        <span className="text-xs font-medium whitespace-nowrap">
                          {amount} {currency}
                        </span>
                      )
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {pagination.total} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

