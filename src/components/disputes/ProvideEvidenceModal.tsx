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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CARRIER_CODES,
  CARRIER_DISPLAY_NAMES,
  TRACKING_STATUS_DISPLAY,
  TrackingStatus,
} from "@/lib/paypal/tracking"

// Evidence types matching PayPal's supported types
const EVIDENCE_TYPES = {
  PROOF_OF_FULFILLMENT: "Provide Fulfilment Information",
  PROOF_OF_REFUND: "Refund Information",
  OTHER: "Any other information",
} as const

type EvidenceType = keyof typeof EVIDENCE_TYPES

interface ProvideEvidenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  transactionId?: string | null
  onSuccess: () => void
}

export function ProvideEvidenceModal({
  open,
  onOpenChange,
  disputeId,
  transactionId,
  onSuccess,
}: ProvideEvidenceModalProps) {
  const [evidenceType, setEvidenceType] = React.useState<EvidenceType>("PROOF_OF_FULFILLMENT")
  const [note, setNote] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [carrier, setCarrier] = React.useState("")
  const [carrierOther, setCarrierOther] = React.useState("")
  const [trackingStatus, setTrackingStatus] = React.useState<TrackingStatus>("SHIPPED")
  const [trackingUrl, setTrackingUrl] = React.useState("")
  const [refundId, setRefundId] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const resetForm = () => {
    setEvidenceType("PROOF_OF_FULFILLMENT")
    setNote("")
    setTrackingNumber("")
    setCarrier("")
    setCarrierOther("")
    setTrackingStatus("SHIPPED")
    setTrackingUrl("")
    setRefundId("")
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: If fulfillment info with tracking, call Add Tracking API first
      if (
        evidenceType === "PROOF_OF_FULFILLMENT" &&
        trackingNumber &&
        carrier &&
        transactionId
      ) {
        const trackingResponse = await fetch(`/api/disputes/${disputeId}/add-tracking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionId,
            trackingNumber,
            carrier: carrier === "OTHER" ? "OTHER" : carrier,
            status: trackingStatus,
            carrierNameOther: carrier === "OTHER" ? carrierOther : undefined,
            trackingUrl: trackingUrl || undefined,
          }),
        })

        if (!trackingResponse.ok) {
          const trackingError = await trackingResponse.json()
          console.warn("Tracking API warning:", trackingError)
          // Don't fail - continue with evidence submission even if tracking fails
          // PayPal may already have tracking or transaction may not support it
        }
      }

      // Step 2: Call Provide Evidence API
      const evidence: any[] = []

      if (evidenceType === "PROOF_OF_FULFILLMENT") {
        // Add tracking info as evidence
        if (trackingNumber || carrier) {
          evidence.push({
            evidence_type: "PROOF_OF_FULFILLMENT",
            evidence_info: {
              tracking_info: [
                {
                  carrier_name: carrier === "OTHER" ? carrierOther : carrier || undefined,
                  tracking_number: trackingNumber || undefined,
                },
              ],
            },
          })
        }
      } else if (evidenceType === "PROOF_OF_REFUND") {
        // Add refund info as evidence
        if (refundId) {
          evidence.push({
            evidence_type: "PROOF_OF_REFUND",
            evidence_info: {
              refund_ids: [refundId],
            },
          })
        }
      } else {
        // OTHER evidence type - just use note
        if (note) {
          evidence.push({
            evidence_type: "OTHER",
            evidence_info: {
              notes: note,
            },
          })
        }
      }

      // If no evidence items but has a note, add it
      if (evidence.length === 0 && note) {
        evidence.push({
          evidence_type: evidenceType,
          evidence_info: {
            notes: note,
          },
        })
      }

      if (evidence.length === 0) {
        setError("Please provide at least one piece of evidence")
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
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to provide evidence")
      }

      onSuccess()
      handleClose(false)
    } catch (error) {
      console.error("Error providing evidence:", error)
      setError(error instanceof Error ? error.message : "Failed to provide evidence. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Get ordered carrier list
  const carrierList = Object.keys(CARRIER_CODES)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Evidence</DialogTitle>
          <DialogDescription>
            Submit evidence to support your case in this dispute.
            {!transactionId && (
              <span className="block mt-1 text-yellow-600">
                Note: Transaction ID not available. Tracking will be added to evidence only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Evidence Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="evidence-type">Evidence Type</Label>
              <Select
                value={evidenceType}
                onValueChange={(value) => setEvidenceType(value as EvidenceType)}
                disabled={loading}
              >
                <SelectTrigger id="evidence-type">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVIDENCE_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fulfilment Information Fields */}
            {evidenceType === "PROOF_OF_FULFILLMENT" && (
              <>
                {/* Carrier Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select
                    value={carrier}
                    onValueChange={setCarrier}
                    disabled={loading}
                  >
                    <SelectTrigger id="carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {carrierList.map((code) => (
                        <SelectItem key={code} value={code}>
                          {CARRIER_DISPLAY_NAMES[code] || code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Other Carrier Name (when OTHER is selected) */}
                {carrier === "OTHER" && (
                  <div className="space-y-2">
                    <Label htmlFor="carrier-other">Carrier Name</Label>
                    <Input
                      id="carrier-other"
                      value={carrierOther}
                      onChange={(e) => setCarrierOther(e.target.value)}
                      placeholder="Enter carrier name"
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Tracking Number */}
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

                {/* Tracking Status Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="tracking-status">Tracking Status</Label>
                  <Select
                    value={trackingStatus}
                    onValueChange={(value) => setTrackingStatus(value as TrackingStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger id="tracking-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRACKING_STATUS_DISPLAY).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tracking URL (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="tracking-url">Tracking Link (Optional)</Label>
                  <Input
                    id="tracking-url"
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Refund Information Fields */}
            {evidenceType === "PROOF_OF_REFUND" && (
              <div className="space-y-2">
                <Label htmlFor="refund-id">Refund ID</Label>
                <Input
                  id="refund-id"
                  value={refundId}
                  onChange={(e) => setRefundId(e.target.value)}
                  placeholder="Enter PayPal refund ID"
                  disabled={loading}
                />
              </div>
            )}

            {/* Note (for all types) */}
            <div className="space-y-2">
              <Label htmlFor="note">
                {evidenceType === "OTHER" ? "Evidence Details" : "Additional Notes (Optional)"}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  evidenceType === "OTHER"
                    ? "Describe the evidence you are providing..."
                    : "Add any additional information..."
                }
                rows={4}
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
              {loading ? "Submitting..." : "Submit Evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
