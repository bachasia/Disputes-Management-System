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
import { Input } from "@/components/ui/input"

interface ProvideEvidenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  onSuccess: () => void
}

export function ProvideEvidenceModal({
  open,
  onOpenChange,
  disputeId,
  onSuccess,
}: ProvideEvidenceModalProps) {
  const [note, setNote] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [carrierName, setCarrierName] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const evidence: any[] = []

      // Add tracking info if provided
      if (trackingNumber || carrierName) {
        evidence.push({
          evidence_type: "PROOF_OF_FULFILLMENT",
          evidence_info: {
            tracking_info: [
              {
                carrier_name: carrierName || undefined,
                tracking_number: trackingNumber || undefined,
              },
            ],
          },
        })
      }

      if (evidence.length === 0) {
        alert("Please provide at least one piece of evidence")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/disputes/${disputeId}/provide-evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evidence,
          note: note || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to provide evidence")
      }

      onSuccess()
      onOpenChange(false)
      setNote("")
      setTrackingNumber("")
      setCarrierName("")
    } catch (error) {
      console.error("Error providing evidence:", error)
      alert("Failed to provide evidence. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Provide Evidence</DialogTitle>
          <DialogDescription>
            Submit evidence to support your case in this dispute.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier Name</Label>
              <Input
                id="carrier"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="e.g., UPS, FedEx, DHL"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add additional information..."
                rows={4}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


