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
import { DollarSign } from "lucide-react"

interface MakeOfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  disputeAmount: number | null
  disputeCurrency: string | null
  onSuccess: () => void
}

const OFFER_TYPES = [
  { value: "REFUND", label: "Refund" },
  { value: "REFUND_WITH_RETURN", label: "Refund with Return" },
  { value: "REFUND_WITH_REPLACEMENT", label: "Refund with Replacement" },
  { value: "REPLACEMENT_WITHOUT_REFUND", label: "Replacement without Refund" },
] as const

export function MakeOfferModal({
  open,
  onOpenChange,
  disputeId,
  disputeAmount,
  disputeCurrency,
  onSuccess,
}: MakeOfferModalProps) {
  const [note, setNote] = React.useState("")
  const [offerType, setOfferType] = React.useState<string>("")
  const [offerAmount, setOfferAmount] = React.useState("")
  const [invoiceId, setInvoiceId] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  // Return shipping address fields
  const [returnAddress, setReturnAddress] = React.useState({
    country_code: "",
    address_line_1: "",
    address_line_2: "",
    admin_area_1: "",
    admin_area_2: "",
    postal_code: "",
  })

  const requiresReturnAddress = offerType === "REFUND_WITH_RETURN" || offerType === "REFUND_WITH_REPLACEMENT"

  // Set default amount to dispute amount when modal opens
  React.useEffect(() => {
    if (open && disputeAmount && !offerAmount) {
      setOfferAmount(disputeAmount.toString())
    }
  }, [open, disputeAmount, offerAmount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!note.trim()) {
        alert("Please enter a note")
        setLoading(false)
        return
      }

      if (!offerType) {
        alert("Please select an offer type")
        setLoading(false)
        return
      }

      if (!offerAmount || parseFloat(offerAmount) <= 0) {
        alert("Please enter a valid offer amount")
        setLoading(false)
        return
      }

      if (requiresReturnAddress && !returnAddress.country_code) {
        alert("Please provide return shipping address (at least country code)")
        setLoading(false)
        return
      }

      const requestBody: any = {
        note: note.trim(),
        offer_type: offerType,
        offer_amount: {
          currency_code: disputeCurrency || "USD",
          value: parseFloat(offerAmount).toFixed(2),
        },
      }

      // Add return shipping address if required
      if (requiresReturnAddress && returnAddress.country_code) {
        requestBody.return_shipping_address = {
          country_code: returnAddress.country_code,
          address_line_1: returnAddress.address_line_1 || undefined,
          address_line_2: returnAddress.address_line_2 || undefined,
          admin_area_1: returnAddress.admin_area_1 || undefined,
          admin_area_2: returnAddress.admin_area_2 || undefined,
          postal_code: returnAddress.postal_code || undefined,
        }
      }

      // Add invoice ID if provided
      if (invoiceId.trim()) {
        requestBody.invoice_id = invoiceId.trim()
      }

      const response = await fetch(`/api/disputes/${disputeId}/make-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to make offer")
      }

      onSuccess()
      onOpenChange(false)
      // Reset form
      setNote("")
      setOfferType("")
      setOfferAmount("")
      setInvoiceId("")
      setReturnAddress({
        country_code: "",
        address_line_1: "",
        address_line_2: "",
        admin_area_1: "",
        admin_area_2: "",
        postal_code: "",
      })
    } catch (error) {
      console.error("Error making offer:", error)
      alert(error instanceof Error ? error.message : "Failed to make offer. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make Offer to Resolve Dispute</DialogTitle>
          <DialogDescription>
            Propose a resolution offer to the customer. This only works when the dispute stage is INQUIRY.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer_type">Offer Type *</Label>
              <Select value={offerType} onValueChange={setOfferType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select offer type" />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer_amount">Offer Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="offer_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Currency: {disputeCurrency || "USD"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_id">Invoice ID (Optional)</Label>
                <Input
                  id="invoice_id"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Invoice ID"
                  disabled={loading}
                />
              </div>
            </div>

            {requiresReturnAddress && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-sm font-semibold">Return Shipping Address *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country_code">Country Code *</Label>
                    <Input
                      id="country_code"
                      value={returnAddress.country_code}
                      onChange={(e) =>
                        setReturnAddress({ ...returnAddress, country_code: e.target.value.toUpperCase() })
                      }
                      placeholder="US"
                      maxLength={2}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={returnAddress.postal_code}
                      onChange={(e) =>
                        setReturnAddress({ ...returnAddress, postal_code: e.target.value })
                      }
                      placeholder="12345"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_line_1">Address Line 1</Label>
                  <Input
                    id="address_line_1"
                    value={returnAddress.address_line_1}
                    onChange={(e) =>
                      setReturnAddress({ ...returnAddress, address_line_1: e.target.value })
                    }
                    placeholder="Street address"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_line_2">Address Line 2</Label>
                  <Input
                    id="address_line_2"
                    value={returnAddress.address_line_2}
                    onChange={(e) =>
                      setReturnAddress({ ...returnAddress, address_line_2: e.target.value })
                    }
                    placeholder="Apartment, suite, etc."
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_area_1">State/Province</Label>
                    <Input
                      id="admin_area_1"
                      value={returnAddress.admin_area_1}
                      onChange={(e) =>
                        setReturnAddress({ ...returnAddress, admin_area_1: e.target.value })
                      }
                      placeholder="State or Province"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_area_2">City</Label>
                    <Input
                      id="admin_area_2"
                      value={returnAddress.admin_area_2}
                      onChange={(e) =>
                        setReturnAddress({ ...returnAddress, admin_area_2: e.target.value })
                      }
                      placeholder="City"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Note *</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your notes about this offer (1-2000 characters)"
                rows={4}
                maxLength={2000}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                {note.length}/2000 characters
              </p>
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
              {loading ? "Submitting..." : "Make Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

