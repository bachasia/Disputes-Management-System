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
import { Sparkles, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface AIAssistantsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  disputeData?: {
    caseId: string
    invoiceNumber: string | null
    disputeReason: string | null
    rawData?: any | null
  }
  onSuccess?: () => void
}

export function AIAssistantsModal({
  open,
  onOpenChange,
  disputeId,
  disputeData,
  onSuccess,
}: AIAssistantsModalProps) {
  const [selectedAI, setSelectedAI] = React.useState<"openai" | "google" | "deepseek">("openai")
  const [disputeType, setDisputeType] = React.useState<"ITEM_NOT_RECEIVED" | "NOT_AS_DESCRIBED">("ITEM_NOT_RECEIVED")
  const [caseId, setCaseId] = React.useState("")
  const [orderId, setOrderId] = React.useState("")
  const [deliveryDate, setDeliveryDate] = React.useState("")
  const [carrier, setCarrier] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [customerComplaint, setCustomerComplaint] = React.useState("")
  const [supportActions, setSupportActions] = React.useState("")
  const [returnPolicyUrl, setReturnPolicyUrl] = React.useState("")
  const [shippingPolicyUrl, setShippingPolicyUrl] = React.useState("")
  const [response, setResponse] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  // Auto-fill Case ID, Order ID, and Customer Complaint when disputeData changes
  React.useEffect(() => {
    if (disputeData) {
      setCaseId(disputeData.caseId || "")
      setOrderId(disputeData.invoiceNumber || "")
      
      // Set dispute type based on dispute reason
      if (disputeData.disputeReason) {
        const reason = disputeData.disputeReason.toUpperCase()
        if (reason.includes("NOT_RECEIVED") || reason.includes("NOT RECEIVED")) {
          setDisputeType("ITEM_NOT_RECEIVED")
        } else if (reason.includes("NOT_AS_DESCRIBED") || reason.includes("NOT AS DESCRIBED")) {
          setDisputeType("NOT_AS_DESCRIBED")
        }
      }

      // Auto-fill Customer Complaint from Evidence Notes submitted by buyer
      if (disputeData.rawData?.evidences && Array.isArray(disputeData.rawData.evidences)) {
        const buyerEvidence = disputeData.rawData.evidences.find(
          (evidence: any) => 
            evidence.source === "SUBMITTED_BY_BUYER" && 
            evidence.notes && 
            evidence.notes.trim()
        )
        
        if (buyerEvidence && buyerEvidence.notes) {
          setCustomerComplaint(buyerEvidence.notes.trim())
        }
      }
    }
  }, [disputeData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!caseId.trim()) {
      toast.error("Case ID is required")
      return
    }

    if (!customerComplaint.trim()) {
      toast.error("Customer Complaint is required")
      return
    }

    setLoading(true)
    setResponse("")

    try {
      const response = await fetch(`/api/disputes/${disputeId}/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiProvider: selectedAI,
          formData: {
            disputeType,
            caseId: caseId.trim(),
            orderId: orderId.trim(),
            deliveryDate: deliveryDate.trim(),
            carrier: carrier.trim(),
            trackingNumber: trackingNumber.trim(),
            customerComplaint: customerComplaint.trim(),
            supportActions: supportActions.trim(),
            returnPolicyUrl: returnPolicyUrl.trim(),
            shippingPolicyUrl: shippingPolicyUrl.trim(),
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to get AI response")
      }

      const data = await response.json()
      setResponse(data.response || "No response received")
      toast.success("AI response generated successfully")
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to get AI response"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setResponse("")
    setSelectedAI("openai")
    setDisputeType("ITEM_NOT_RECEIVED")
    setDeliveryDate("")
    setCarrier("")
    setTrackingNumber("")
    setCustomerComplaint("")
    setSupportActions("")
    setReturnPolicyUrl("")
    setShippingPolicyUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistants - Case Information
          </DialogTitle>
          <DialogDescription>
            Fill in the case details and generate a professional response using AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedAI} onValueChange={(v) => setSelectedAI(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="google">Google AI</TabsTrigger>
            <TabsTrigger value="deepseek">Deepseek AI</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedAI} className="mt-4">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Dispute Type */}
                <div className="space-y-2">
                  <Label>Dispute Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={disputeType === "ITEM_NOT_RECEIVED" ? "default" : "outline"}
                      onClick={() => setDisputeType("ITEM_NOT_RECEIVED")}
                      className="flex-1"
                      disabled={loading}
                    >
                      Item Not Received
                    </Button>
                    <Button
                      type="button"
                      variant={disputeType === "NOT_AS_DESCRIBED" ? "default" : "outline"}
                      onClick={() => setDisputeType("NOT_AS_DESCRIBED")}
                      className="flex-1"
                      disabled={loading}
                    >
                      Not as Described
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Case ID */}
                  <div className="space-y-2">
                    <Label htmlFor="caseId">Case ID</Label>
                    <Input
                      id="caseId"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      placeholder="PP-R-XXX-XXXXXXXXX"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Order ID */}
                  <div className="space-y-2">
                    <Label htmlFor="orderId">Order ID</Label>
                    <Input
                      id="orderId"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Order ID"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Delivery Date */}
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Carrier */}
                  <div className="space-y-2">
                    <Label htmlFor="carrier">Carrier</Label>
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="e.g. USPS, DHL"
                      disabled={loading}
                    />
                  </div>

                  {/* Tracking Number */}
                  <div className="space-y-2">
                    <Label htmlFor="trackingNumber">Tracking Number</Label>
                    <Input
                      id="trackingNumber"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. UK61029126"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Customer Complaint */}
                <div className="space-y-2">
                  <Label htmlFor="customerComplaint">Customer Complaint</Label>
                  <Textarea
                    id="customerComplaint"
                    value={customerComplaint}
                    onChange={(e) => setCustomerComplaint(e.target.value)}
                    placeholder="Paste customer's message or reason here..."
                    rows={4}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Support Actions Offered */}
                <div className="space-y-2">
                  <Label htmlFor="supportActions">Support Actions Offered</Label>
                  <Textarea
                    id="supportActions"
                    value={supportActions}
                    onChange={(e) => setSupportActions(e.target.value)}
                    placeholder="e.g. Offered 20% refund, provided tracking link again, explained policy..."
                    rows={4}
                    disabled={loading}
                  />
                </div>

                {/* Store Policy Links */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label>Store Policy Links (Optional)</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="returnPolicyUrl" className="text-sm font-normal">Return/Refund Policy URL</Label>
                      <Input
                        id="returnPolicyUrl"
                        type="url"
                        value={returnPolicyUrl}
                        onChange={(e) => setReturnPolicyUrl(e.target.value)}
                        placeholder="https://example-store.com/pages/return-refund"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingPolicyUrl" className="text-sm font-normal">Shipping Policy URL</Label>
                      <Input
                        id="shippingPolicyUrl"
                        type="url"
                        value={shippingPolicyUrl}
                        onChange={(e) => setShippingPolicyUrl(e.target.value)}
                        placeholder="https://example-store.com/pages/shipping"
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These policy links will be referenced in your PayPal response for transparency and credibility.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !caseId.trim() || !customerComplaint.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Case Response
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>

            {response && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">AI Response</h4>
                    <span className="text-xs text-muted-foreground">
                      Generated by {selectedAI === "openai" ? "OpenAI" : selectedAI === "google" ? "Google AI" : "Deepseek AI"}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm bg-background p-3 rounded border">
                    {response}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

