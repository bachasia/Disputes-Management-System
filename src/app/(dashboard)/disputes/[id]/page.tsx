"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  FileText,
  MessageSquare,
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { StatusBadge } from "@/components/disputes/StatusBadge"
import { ReasonBadge } from "@/components/disputes/ReasonBadge"
import { AcceptClaimModal } from "@/components/disputes/AcceptClaimModal"
import { ProvideEvidenceModal } from "@/components/disputes/ProvideEvidenceModal"
import { SendMessageModal } from "@/components/disputes/SendMessageModal"

interface DisputeDetail {
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
  disputeCreateTime: Date | null
  disputeUpdateTime: Date | null
  responseDueDate: Date | null
  resolvedAt: Date | null
  description: string | null
  rawData: any | null
  paypalAccount: {
    id: string
    accountName: string
    email: string
    sandboxMode: boolean
  } | null
  history: Array<{
    id: string
    actionType: string
    actionBy: string | null
    oldValue: string | null
    newValue: string | null
    description: string | null
    createdAt: Date
  }>
  messages: Array<{
    id: string
    messageType: string
    postedBy: string | null
    content: string | null
    attachments: any
    createdAt: Date
  }>
}

export default function DisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "viewer"
  const disputeId = params.id as string

  const [dispute, setDispute] = React.useState<DisputeDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [acceptClaimOpen, setAcceptClaimOpen] = React.useState(false)
  const [provideEvidenceOpen, setProvideEvidenceOpen] = React.useState(false)
  const [sendMessageOpen, setSendMessageOpen] = React.useState(false)

  const fetchDisputeDetail = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/disputes/${disputeId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch dispute")
      }
      const data = await response.json()
      setDispute(data)
    } catch (error) {
      console.error("Error fetching dispute:", error)
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  React.useEffect(() => {
    fetchDisputeDetail()
  }, [fetchDisputeDetail])

  // Update breadcrumb with Case ID
  React.useEffect(() => {
    if (dispute?.disputeId && typeof window !== "undefined") {
      ;(window as any).__lastBreadcrumbLabel = dispute.disputeId
    }
    return () => {
      if (typeof window !== "undefined") {
        ;(window as any).__lastBreadcrumbLabel = null
      }
    }
  }, [dispute?.disputeId])

  const getPayPalResolutionUrl = (disputeId: string, sandbox: boolean) => {
    const baseUrl = sandbox
      ? "https://www.sandbox.paypal.com"
      : "https://www.paypal.com"
    return `${baseUrl}/resolutioncenter/viewdispute?disputeId=${disputeId}`
  }

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount) return "N/A"
    const currencySymbol = currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencySymbol,
    }).format(amount)
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case "STATUS_CHANGED":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case "MESSAGE_SENT":
        return <MessageSquare className="h-5 w-5 text-green-500" />
      case "EVIDENCE_PROVIDED":
        return <FileText className="h-5 w-5 text-purple-500" />
      case "CLAIM_ACCEPTED":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Dispute not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/disputes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Disputes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/disputes")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Disputes
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">Case ID: {dispute.disputeId}</CardTitle>
                <a
                  href={getPayPalResolutionUrl(
                    dispute.disputeId,
                    dispute.paypalAccount?.sandboxMode ?? false
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={dispute.disputeStatus} />
                <ReasonBadge reason={dispute.disputeReason} />
              </div>
              <div className="text-sm text-muted-foreground">
                Created:{" "}
                {dispute.disputeCreateTime
                  ? format(new Date(dispute.disputeCreateTime), "PPpp")
                  : "N/A"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {formatAmount(dispute.disputeAmount, dispute.disputeCurrency)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isViewer && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setAcceptClaimOpen(true)}
                disabled={dispute.disputeStatus === "RESOLVED"}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept Claim
              </Button>
              <Button
                variant="outline"
                onClick={() => setProvideEvidenceOpen(true)}
                disabled={dispute.disputeStatus === "RESOLVED"}
              >
                <FileText className="mr-2 h-4 w-4" />
                Provide Evidence
              </Button>
              <Button
                variant="outline"
                onClick={() => setSendMessageOpen(true)}
                disabled={dispute.disputeStatus === "RESOLVED"}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Transaction ID
              </label>
              <p className="mt-1 font-mono text-sm">
                {dispute.transactionId || "N/A"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Invoice Number
              </label>
              <p className="mt-1 font-mono text-sm">
                {dispute.invoiceNumber || "N/A"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Customer
              </label>
              <div className="mt-1 space-y-1">
                {dispute.customerName && (
                  <p className="text-sm">{dispute.customerName}</p>
                )}
                {dispute.customerEmail && (
                  <p className="text-sm text-muted-foreground">
                    {dispute.customerEmail}
                  </p>
                )}
                {!dispute.customerName && !dispute.customerEmail && (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Dispute Type
              </label>
              <p className="mt-1 text-sm">{dispute.disputeType || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Dispute Reason
              </label>
              <p className="mt-1 text-sm">{dispute.disputeReason || "N/A"}</p>
            </div>

            {dispute.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {dispute.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline & Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Important Dates
              </label>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {dispute.disputeCreateTime
                      ? format(new Date(dispute.disputeCreateTime), "PPp")
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>
                    {dispute.disputeUpdateTime
                      ? format(new Date(dispute.disputeUpdateTime), "PPp")
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Due:</span>
                  <span>
                    {dispute.responseDueDate
                      ? format(new Date(dispute.responseDueDate), "PPp")
                      : "N/A"}
                  </span>
                </div>
                {dispute.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved:</span>
                    <span>
                      {format(new Date(dispute.resolvedAt), "PPp")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                PayPal Account
              </label>
              {dispute.paypalAccount ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">
                    {dispute.paypalAccount.accountName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dispute.paypalAccount.email}
                  </p>
                  <Badge variant={dispute.paypalAccount.sandboxMode ? "secondary" : "default"}>
                    {dispute.paypalAccount.sandboxMode ? "Sandbox" : "Live"}
                  </Badge>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Section */}
      {dispute.history && dispute.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {dispute.history.map((item, index) => (
                <div key={item.id} className="relative pb-8">
                  {index !== dispute.history.length - 1 && (
                    <div className="absolute left-5 top-10 h-full w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {getActionIcon(item.actionType)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.actionType}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "PPp")}
                        </p>
                      </div>
                      {item.oldValue && item.newValue && (
                        <p className="text-sm text-muted-foreground">
                          {item.oldValue} → {item.newValue}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.actionBy && (
                        <p className="text-xs text-muted-foreground">
                          By: {item.actionBy}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence Notes Section */}
      {dispute.rawData?.evidences && Array.isArray(dispute.rawData.evidences) && dispute.rawData.evidences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispute.rawData.evidences
              .filter((evidence: any) => evidence.notes)
              .map((evidence: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg border bg-card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {evidence.evidence_type || "Evidence"}
                      </span>
                      {evidence.source && (
                        <Badge variant="outline" className="text-xs">
                          {evidence.source}
                        </Badge>
                      )}
                    </div>
                    {evidence.date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(evidence.date), "PPp")}
                      </span>
                    )}
                  </div>
                  {evidence.notes && (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {evidence.notes}
                    </p>
                  )}
                  {evidence.documents && Array.isArray(evidence.documents) && evidence.documents.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Documents:
                      </p>
                      {evidence.documents.map((doc: any, idx: number) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          {doc.name || doc.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Messages/Evidence Section */}
      {dispute.messages && dispute.messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages & Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispute.messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {message.postedBy || "Unknown"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.messageType}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.createdAt), "PPp")}
                  </span>
                </div>
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Attachments:
                    </p>
                    {message.attachments.map((attachment: any, idx: number) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        {attachment.name || attachment.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AcceptClaimModal
        open={acceptClaimOpen}
        onOpenChange={setAcceptClaimOpen}
        disputeId={dispute.disputeId}
        onSuccess={fetchDisputeDetail}
      />
      <ProvideEvidenceModal
        open={provideEvidenceOpen}
        onOpenChange={setProvideEvidenceOpen}
        disputeId={dispute.disputeId}
        onSuccess={fetchDisputeDetail}
      />
      <SendMessageModal
        open={sendMessageOpen}
        onOpenChange={setSendMessageOpen}
        disputeId={dispute.disputeId}
        onSuccess={fetchDisputeDetail}
      />
    </div>
  )
}

