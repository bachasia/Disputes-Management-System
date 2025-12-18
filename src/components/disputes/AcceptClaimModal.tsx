"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AcceptClaimReason,
  ACCEPT_CLAIM_REASON_DISPLAY,
} from "@/lib/paypal/disputes"
import { DollarSign } from "lucide-react"

interface FullRefundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  disputeAmount?: number | null
  disputeCurrency?: string | null
  onSuccess: () => void
}

export function FullRefundModal({
  open,
  onOpenChange,
  disputeId,
  disputeAmount,
  disputeCurrency,
  onSuccess,
}: FullRefundModalProps) {
  const [note, setNote] = React.useState("")
  const [reason, setReason] = React.useState<AcceptClaimReason | "">("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const resetForm = () => {
    setNote("")
    setReason("")
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const formatAmount = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (!amount) return "N/A"
    const currencyCode = currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/disputes/${disputeId}/accept-claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: note || undefined,
          acceptClaimReason: reason || undefined,
          // For full refund, we send the full dispute amount
          refundAmount: disputeAmount && disputeCurrency ? {
            currencyCode: disputeCurrency,
            value: disputeAmount.toString(),
          } : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to process refund")
      }

      onSuccess()
      handleClose(false)
    } catch (error) {
      console.error("Error processing refund:", error)
      setError(error instanceof Error ? error.message : "Failed to process refund. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const reasonOptions = Object.entries(ACCEPT_CLAIM_REASON_DISPLAY) as [AcceptClaimReason, string][]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Full Refund</DialogTitle>
          <DialogDescription>
            Issue a full refund to close this dispute. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Refund Amount Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refund Amount</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(disputeAmount, disputeCurrency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refund (Optional)</Label>
              <Select
                value={reason}
                onValueChange={(value) => setReason(value as AcceptClaimReason)}
                disabled={loading}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this refund..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Issue Full Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Keep old name for backward compatibility
export { FullRefundModal as AcceptClaimModal }
