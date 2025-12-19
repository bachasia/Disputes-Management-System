"use client"

import { Badge } from "@/components/ui/badge"
import { Trophy, XCircle, Ban, CheckCircle2, DollarSign, Eye, Clock } from "lucide-react"

interface StatusBadgeProps {
  status: string | null
  outcome?: string | null
  rawData?: any
}

/**
 * Safely convert value to uppercase string
 */
function safeToUpper(value: any): string {
  if (value == null) return ""
  if (typeof value === "string") return value.toUpperCase().trim()
  return String(value).toUpperCase().trim()
}

/**
 * Check if dispute is cancelled from rawData (even without explicit outcome)
 */
function isCancelledFromRawData(rawData: any): boolean {
  if (!rawData || typeof rawData !== "object") {
    return false
  }

  const raw = rawData as any

  // Check status fields for cancelled indicators
  const status = raw.status || raw.dispute_status || raw.dispute_state
  if (status) {
    const statusUpper = safeToUpper(status)
    if (
      statusUpper.includes("CANCEL") ||
      statusUpper.includes("WITHDRAWN") ||
      statusUpper === "CANCELLED" ||
      statusUpper === "CANCELED"
    ) {
      return true
    }
  }

  // Check outcome fields for cancelled indicators
  const outcome = raw.outcome || raw.dispute_outcome
  if (outcome) {
    const outcomeUpper = safeToUpper(outcome)
    if (
      outcomeUpper.includes("CANCEL") ||
      outcomeUpper.includes("WITHDRAWN") ||
      outcomeUpper === "CANCELLED" ||
      outcomeUpper === "CANCELED"
    ) {
      return true
    }
  }

  return false
}

/**
 * Extract actual outcome from disputeOutcome or rawData
 */
function getActualOutcome(outcome: string | null | undefined, rawData: any): string | null {
  // If outcome exists and is not just "RESOLVED" or "CLOSED", use it
  if (outcome) {
    const outcomeUpper = safeToUpper(outcome)
    if (
      outcomeUpper &&
      outcomeUpper !== "RESOLVED" &&
      outcomeUpper !== "CLOSED"
    ) {
      return typeof outcome === "string" ? outcome : String(outcome)
    }
  }

  // Try to extract from rawData if available
  if (rawData && typeof rawData === "object") {
    const raw = rawData as any

    // Check for outcome field in rawData (most common - top level)
    if (raw.outcome) {
      const outcomeUpper = safeToUpper(raw.outcome)
      if (
        outcomeUpper &&
        outcomeUpper !== "RESOLVED" &&
        outcomeUpper !== "CLOSED"
      ) {
        return typeof raw.outcome === "string" ? raw.outcome : String(raw.outcome)
      }
    }

    // Check for dispute_outcome.outcome_code (PayPal API format)
    if (raw.dispute_outcome) {
      if (typeof raw.dispute_outcome === "object" && raw.dispute_outcome.outcome_code) {
        const outcomeCode = raw.dispute_outcome.outcome_code
        const outcomeUpper = safeToUpper(outcomeCode)
        if (
          outcomeUpper &&
          outcomeUpper !== "RESOLVED" &&
          outcomeUpper !== "CLOSED"
        ) {
          return typeof outcomeCode === "string" ? outcomeCode : String(outcomeCode)
        }
      } else if (typeof raw.dispute_outcome === "string") {
        const outcomeUpper = safeToUpper(raw.dispute_outcome)
        if (
          outcomeUpper &&
          outcomeUpper !== "RESOLVED" &&
          outcomeUpper !== "CLOSED"
        ) {
          return raw.dispute_outcome
        }
      }
    }

    // Check adjudications array (last adjudication is most recent)
    if (
      raw.adjudications &&
      Array.isArray(raw.adjudications) &&
      raw.adjudications.length > 0
    ) {
      const lastAdjudication = raw.adjudications[raw.adjudications.length - 1]
      if (lastAdjudication.type) {
        const typeUpper = safeToUpper(lastAdjudication.type)
        if (typeUpper && typeUpper !== "RESOLVED") {
          return typeof lastAdjudication.type === "string" ? lastAdjudication.type : String(lastAdjudication.type)
        }
      }
    }
  }

  return null
}

/**
 * Check if dispute is refunded from outcome or rawData
 * Refunded can be detected from:
 * - Explicit outcome: REFUNDED, REFUND, FULL_REFUND
 * - Accept claim action (seller accepted = full refund)
 * - Refund details in rawData
 * - Adjudications indicating refund
 */
function isRefunded(outcome: string | null | undefined, rawData: any): boolean {
  // Check explicit outcome first
  if (outcome) {
    const outcomeUpper = safeToUpper(outcome)
    if (
      outcomeUpper === "REFUNDED" ||
      outcomeUpper === "REFUND" ||
      outcomeUpper === "FULL_REFUND" ||
      outcomeUpper === "PARTIAL_REFUND" ||
      outcomeUpper.includes("REFUNDED") ||
      (outcomeUpper.includes("REFUND") && !outcomeUpper.includes("NOT"))
    ) {
      return true
    }
  }

  // Check rawData outcome
  if (rawData && typeof rawData === "object") {
    const raw = rawData as any
    const rawOutcome = raw.outcome || raw.dispute_outcome
    const isResolved = raw.status === "RESOLVED" || raw.dispute_state === "RESOLVED"
    
    // Check outcome field
    if (rawOutcome) {
      const outcomeUpper = safeToUpper(rawOutcome)
      if (
        outcomeUpper === "REFUNDED" ||
        outcomeUpper === "REFUND" ||
        outcomeUpper === "FULL_REFUND" ||
        outcomeUpper === "PARTIAL_REFUND" ||
        outcomeUpper.includes("REFUNDED") ||
        (outcomeUpper.includes("REFUND") && !outcomeUpper.includes("NOT"))
      ) {
        return true
      }
    }

    // Check adjudications array for refund indicators
    // Only check if dispute is resolved to avoid false positives
    if (isResolved && raw.adjudications && Array.isArray(raw.adjudications)) {
      for (const adj of raw.adjudications) {
        if (adj.type) {
          const adjType = safeToUpper(adj.type)
          // Be more specific - only exact matches or clear refund indicators
          if (
            adjType === "FULL_REFUND" ||
            adjType === "PARTIAL_REFUND" ||
            adjType === "REFUNDED" ||
            adjType === "REFUND" ||
            (adjType.includes("REFUND") && !adjType.includes("NOT") && !adjType.includes("NO"))
          ) {
            return true
          }
        }
        if (adj.adjudication_type) {
          const adjType = safeToUpper(adj.adjudication_type)
          if (
            adjType === "FULL_REFUND" ||
            adjType === "PARTIAL_REFUND" ||
            adjType === "REFUNDED" ||
            adjType === "REFUND" ||
            (adjType.includes("REFUND") && !adjType.includes("NOT") && !adjType.includes("NO"))
          ) {
            return true
          }
        }
      }
    }

    // Check dispute_outcome.amount_refunded (PayPal API format)
    if (raw.dispute_outcome && typeof raw.dispute_outcome === "object") {
      const disputeOutcome = raw.dispute_outcome
      if (disputeOutcome.amount_refunded) {
        const amountRefunded = disputeOutcome.amount_refunded
        // Check if amount_refunded has a value > 0
        if (
          (typeof amountRefunded === "object" && amountRefunded.value && parseFloat(amountRefunded.value) > 0) ||
          (typeof amountRefunded === "string" && parseFloat(amountRefunded) > 0) ||
          (typeof amountRefunded === "number" && amountRefunded > 0)
        ) {
          return true
        }
      }
    }

    // Check if dispute was resolved by accepting claim (full refund)
    // This is indicated by status being RESOLVED and no specific outcome
    // but we can check history or other indicators
    
    // Only check refund_details if dispute is resolved AND has no explicit outcome
    // This prevents false positives for open disputes
    if (isResolved && !rawOutcome) {
      // Check refund_details object - only if it has actual refund amount/value
      if (raw.refund_details) {
        const refundDetails = raw.refund_details
        // Only consider it refunded if there's an actual refund amount with value
        if (refundDetails.allowed_refund_amount) {
          const amount = refundDetails.allowed_refund_amount
          // Check if it's an object with value property, or a string/number
          if (
            (typeof amount === "object" && amount.value && parseFloat(amount.value) > 0) ||
            (typeof amount === "string" && parseFloat(amount) > 0) ||
            (typeof amount === "number" && amount > 0)
          ) {
            return true
          }
        }
        // Check refund_amount similarly
        if (refundDetails.refund_amount) {
          const amount = refundDetails.refund_amount
          if (
            (typeof amount === "object" && amount.value && parseFloat(amount.value) > 0) ||
            (typeof amount === "string" && parseFloat(amount) > 0) ||
            (typeof amount === "number" && amount > 0)
          ) {
            return true
          }
        }
        // Check refund_status - only if it explicitly indicates refunded
        if (refundDetails.refund_status) {
          const status = safeToUpper(refundDetails.refund_status)
          if (
            status === "REFUNDED" ||
            status === "COMPLETED" ||
            status.includes("REFUND")
          ) {
            return true
          }
        }
      }
    }
  }

  return false
}

/**
 * Check if dispute has offer accepted from outcome or rawData
 * Offer accepted can be detected from:
 * - Explicit outcome: OFFER_ACCEPTED, ACCEPTED_OFFER
 * - Offer object in rawData with accepted status
 * - Seller offered amount exists and dispute is resolved
 * - Adjudications indicating offer accepted
 */
function isOfferAccepted(outcome: string | null | undefined, rawData: any): boolean {
  if (outcome) {
    const outcomeUpper = safeToUpper(outcome)
    if (
      outcomeUpper.includes("OFFER_ACCEPTED") ||
      outcomeUpper.includes("ACCEPTED_OFFER") ||
      outcomeUpper === "OFFER_ACCEPTED" ||
      outcomeUpper === "ACCEPTED_OFFER" ||
      (outcomeUpper.includes("OFFER") && outcomeUpper.includes("ACCEPTED")) ||
      (outcomeUpper.includes("ACCEPTED") && outcomeUpper.includes("OFFER"))
    ) {
      return true
    }
  }

  if (rawData && typeof rawData === "object") {
    const raw = rawData as any
    const rawOutcome = raw.outcome || raw.dispute_outcome
    
    // Check outcome field
    if (rawOutcome) {
      const outcomeUpper = safeToUpper(rawOutcome)
      if (
        outcomeUpper.includes("OFFER_ACCEPTED") ||
        outcomeUpper.includes("ACCEPTED_OFFER") ||
        outcomeUpper === "OFFER_ACCEPTED" ||
        outcomeUpper === "ACCEPTED_OFFER" ||
        (outcomeUpper.includes("OFFER") && outcomeUpper.includes("ACCEPTED")) ||
        (outcomeUpper.includes("ACCEPTED") && outcomeUpper.includes("OFFER"))
      ) {
        return true
      }
    }
    
    // Check adjudications array for offer accepted indicators
    if (raw.adjudications && Array.isArray(raw.adjudications)) {
      for (const adj of raw.adjudications) {
        if (adj.type) {
          const adjType = safeToUpper(adj.type)
          if (
            adjType.includes("OFFER_ACCEPTED") ||
            adjType.includes("ACCEPTED_OFFER") ||
            (adjType.includes("OFFER") && adjType.includes("ACCEPTED"))
          ) {
            return true
          }
        }
        if (adj.adjudication_type) {
          const adjType = safeToUpper(adj.adjudication_type)
          if (
            adjType.includes("OFFER_ACCEPTED") ||
            adjType.includes("ACCEPTED_OFFER") ||
            (adjType.includes("OFFER") && adjType.includes("ACCEPTED"))
          ) {
            return true
          }
        }
      }
    }
    
    // Check if offer exists and has accepted status or seller offered amount
    if (raw.offer) {
      const offer = raw.offer
      
      // Check offer.history for ACCEPTED event (PayPal API format)
      if (offer.history && Array.isArray(offer.history)) {
        const hasAcceptedEvent = offer.history.some(
          (h: any) => h.event_type && safeToUpper(h.event_type) === "ACCEPTED"
        )
        if (hasAcceptedEvent) {
          return true
        }
      }
      
      // Check offer status
      if (offer.status) {
        const offerStatus = safeToUpper(offer.status)
        if (
          offerStatus === "ACCEPTED" || 
          offerStatus.includes("ACCEPTED") ||
          offerStatus === "ACCEPTED_BY_BUYER" ||
          offerStatus === "ACCEPTED_BY_SELLER"
        ) {
          return true
        }
      }
      
      // Check offer state
      if (offer.state) {
        const offerState = safeToUpper(offer.state)
        if (
          offerState === "ACCEPTED" ||
          offerState.includes("ACCEPTED")
        ) {
          return true
        }
      }
      
      // Check if buyer_offered_amount exists (buyer accepted seller's offer)
      if (offer.buyer_offered_amount && offer.buyer_offered_amount.value) {
        const isResolved = raw.status === "RESOLVED" || raw.dispute_state === "RESOLVED"
        if (isResolved) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Determine the display outcome from PayPal outcome string
 * This matches the logic in stats API for consistency
 */
function getOutcomeDisplay(outcome: string | null | undefined): {
  type: "won" | "lost" | "cancelled" | "refunded" | "offer_accepted" | null
  label: string
} {
  if (!outcome) {
    return { type: null, label: "" }
  }

  const outcomeUpper = safeToUpper(outcome)
  if (!outcomeUpper) {
    return { type: null, label: "" }
  }

  // Check for cancelled/withdrawn first
  if (
    outcomeUpper.includes("CANCEL") ||
    outcomeUpper.includes("WITHDRAWN") ||
    outcomeUpper === "CANCELLED" ||
    outcomeUpper === "CANCELED"
  ) {
    return { type: "cancelled", label: "Cancelled" }
  }

  // Check for refunded (separate from buyer win)
  // Check this BEFORE buyer win to avoid false positives
  if (
    outcomeUpper === "REFUNDED" ||
    outcomeUpper === "REFUND" ||
    outcomeUpper === "FULL_REFUND" ||
    outcomeUpper === "PARTIAL_REFUND" ||
    outcomeUpper.includes("REFUNDED") ||
    (outcomeUpper.includes("REFUND") && !outcomeUpper.includes("NOT"))
  ) {
    return { type: "refunded", label: "Refunded" }
  }

  // Check for offer accepted (before checking win/loss)
  // PayPal API uses "ACCEPTED" for offer accepted
  if (
    outcomeUpper === "ACCEPTED" ||
    outcomeUpper.includes("OFFER_ACCEPTED") ||
    outcomeUpper.includes("ACCEPTED_OFFER") ||
    outcomeUpper === "OFFER_ACCEPTED" ||
    outcomeUpper === "ACCEPTED_OFFER" ||
    (outcomeUpper.includes("OFFER") && outcomeUpper.includes("ACCEPTED")) ||
    (outcomeUpper.includes("ACCEPTED") && outcomeUpper.includes("OFFER"))
  ) {
    return { type: "offer_accepted", label: "Offer Accepted" }
  }

  // Check for buyer win indicators (if buyer won, seller lost)
  // PayPal API uses: RESOLVED_BUYER_FAVOUR, LOST, PAID_OUT
  // Exclude REFUNDED as it's now a separate status
  const isBuyerWin =
    outcomeUpper === "PAID_OUT" || // PayPal API: money paid to buyer
    outcomeUpper === "LOST" || // Simplified: seller lost
    outcomeUpper.includes("PAYOUT_TO_BUYER") ||
    outcomeUpper.includes("BUYER_WIN") ||
    outcomeUpper === "RESOLVED_BUYER_FAVOR" ||
    outcomeUpper === "RESOLVED_BUYER_FAVOUR" ||
    outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOR") ||
    outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOUR") ||
    outcomeUpper.includes("BUYER_FAVOR") ||
    outcomeUpper.includes("BUYER_FAVOUR") ||
    outcomeUpper.includes("FAVOR_BUYER") ||
    outcomeUpper.includes("FAVOUR_BUYER") ||
    (outcomeUpper.includes("BUYER") &&
      (outcomeUpper.includes("WON") ||
        outcomeUpper.includes("FAVOR") ||
        outcomeUpper.includes("FAVOUR"))) ||
    outcomeUpper === "BUYER"

  if (isBuyerWin) {
    return { type: "lost", label: "Lost" }
  }

  // Check for seller win indicators
  // PayPal API uses: RESOLVED_SELLER_FAVOUR, WON
  const isSellerWin =
    outcomeUpper === "WON" || // Simplified: seller won
    outcomeUpper === "RESOLVED_SELLER_FAVOR" ||
    outcomeUpper === "RESOLVED_SELLER_FAVOUR" ||
    outcomeUpper === "SELLER_WIN" ||
    outcomeUpper === "RESOLVED_IN_SELLER_FAVOR" ||
    outcomeUpper === "RESOLVED_IN_SELLER_FAVOUR" ||
    outcomeUpper.includes("SELLER_FAVOR") ||
    outcomeUpper.includes("SELLER_FAVOUR") ||
    outcomeUpper.includes("FAVOR_SELLER") ||
    outcomeUpper.includes("FAVOUR_SELLER") ||
    outcomeUpper === "SELLER_FAVORABLE" ||
    outcomeUpper === "FAVORABLE_TO_SELLER" ||
    outcomeUpper === "SELLER_WON" ||
    outcomeUpper.includes("SELLER") ||
    // Check for negative buyer indicators (if buyer lost, seller won)
    (outcomeUpper.includes("BUYER") &&
      (outcomeUpper.includes("LOST") ||
        outcomeUpper.includes("DENIED") ||
        outcomeUpper.includes("REJECTED")))

  if (isSellerWin) {
    return { type: "won", label: "Won" }
  }

  return { type: null, label: "" }
}

export function StatusBadge({ status, outcome, rawData }: StatusBadgeProps) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>
  }

  // Get status from rawData if available (more accurate from PayPal API)
  let actualStatus = status
  if (rawData && typeof rawData === "object") {
    const raw = rawData as any
    // Prefer dispute_state over status from rawData (PayPal API format)
    actualStatus = raw.dispute_state || raw.status || status
  }

  // Ensure status is a string before calling toUpperCase
  const statusUpper = typeof actualStatus === "string" ? actualStatus.toUpperCase() : String(actualStatus || "").toUpperCase()

  if (statusUpper === "OPEN") {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
        Open
      </Badge>
    )
  }
  if (statusUpper.includes("WAITING")) {
    // Debug logging to see actual status values
    if (process.env.NODE_ENV === "development") {
      console.log("[StatusBadge] WAITING status detected:", {
        status,
        statusUpper,
        rawDataStatus: rawData && typeof rawData === "object" ? (rawData as any).status : null,
        rawDataDisputeState: rawData && typeof rawData === "object" ? (rawData as any).dispute_state : null,
      })
    }
    
    // Check for specific waiting statuses and show appropriate labels
    // PayPal API uses: REQUIRED_ACTION, REQUIRED_OTHER_PARTY_ACTION, WAITING_FOR_SELLER_RESPONSE, etc.
    
    // WAITING_FOR_SELLER_RESPONSE - specific badge
    if (statusUpper === "WAITING_FOR_SELLER_RESPONSE") {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          Awaiting your response
        </Badge>
      )
    }
    
    // WAITING_FOR_BUYER_RESPONSE - specific badge
    if (statusUpper === "WAITING_FOR_BUYER_RESPONSE") {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          Waiting for buyer
        </Badge>
      )
    }
    
    // Other seller response waiting statuses
    if (
      statusUpper.includes("WAITING_FOR_SELLER") ||
      statusUpper.includes("SELLER_RESPONSE") ||
      statusUpper === "REQUIRED_ACTION" || // PayPal API: seller needs to respond
      (statusUpper.includes("REQUIRED") && statusUpper.includes("ACTION") && !statusUpper.includes("OTHER"))
    ) {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          Awaiting your response
        </Badge>
      )
    }
    
    // Other buyer response waiting statuses
    if (
      statusUpper.includes("WAITING_FOR_BUYER") ||
      statusUpper.includes("BUYER_RESPONSE") ||
      statusUpper === "REQUIRED_OTHER_PARTY_ACTION" || // PayPal API: waiting for buyer/other party
      (statusUpper.includes("REQUIRED") && statusUpper.includes("OTHER"))
    ) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          Waiting for buyer
        </Badge>
      )
    }
    // Generic waiting status
    return (
      <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-1 whitespace-nowrap">
        <Clock className="h-3 w-3" />
        Waiting
      </Badge>
    )
  }
  if (statusUpper.includes("REVIEW")) {
    return (
      <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1 whitespace-nowrap">
        <Eye className="h-3 w-3" />
        Under Review
      </Badge>
    )
  }
  
  // Check for cancelled/withdrawn status first (these are cancelled disputes)
  if (
    statusUpper.includes("CANCEL") ||
    statusUpper.includes("WITHDRAWN") ||
    statusUpper === "CANCELLED" ||
    statusUpper === "CANCELED"
  ) {
    return (
      <Badge className="bg-gray-500 hover:bg-gray-600 text-white gap-1">
        <Ban className="h-3 w-3" />
        Cancelled
      </Badge>
    )
  }
  
  // For RESOLVED or CLOSED status, show Won/Lost/Cancelled/Refunded/Offer Accepted if outcome is available
  if (statusUpper === "RESOLVED" || statusUpper === "CLOSED") {
    // Extract actual outcome from disputeOutcome or rawData FIRST
    const actualOutcome = getActualOutcome(outcome, rawData)
    
    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === "development") {
      console.log("[StatusBadge] Checking resolved dispute:", {
        status,
        outcome,
        actualOutcome,
        hasRawData: !!rawData,
        rawDataKeys: rawData ? Object.keys(rawData) : [],
      })
    }
    
    // First check if rawData indicates cancelled (even without explicit outcome)
    if (isCancelledFromRawData(rawData)) {
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600 text-white gap-1">
          <Ban className="h-3 w-3" />
          Cancelled
        </Badge>
      )
    }

    // Check for refunded (from outcome or rawData) - check BEFORE won/lost
    // Use both outcome and actualOutcome for better detection
    const isRefundedCheck = isRefunded(outcome, rawData) || isRefunded(actualOutcome, rawData)
    if (process.env.NODE_ENV === "development" && isRefundedCheck) {
      console.log("[StatusBadge] Detected REFUNDED:", { outcome, actualOutcome, rawData })
    }
    if (isRefundedCheck) {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600 text-white gap-1">
          <DollarSign className="h-3 w-3" />
          Refunded
        </Badge>
      )
    }

    // Check for offer accepted (from outcome or rawData) - check BEFORE won/lost
    // Use both outcome and actualOutcome for better detection
    const isOfferAcceptedCheck = isOfferAccepted(outcome, rawData) || isOfferAccepted(actualOutcome, rawData)
    if (process.env.NODE_ENV === "development" && isOfferAcceptedCheck) {
      console.log("[StatusBadge] Detected OFFER ACCEPTED:", { outcome, actualOutcome, rawData })
    }
    if (isOfferAcceptedCheck) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Offer Accepted
        </Badge>
      )
    }

    // Now check for Won/Lost/Cancelled using outcome display
    // Try actualOutcome first, then fallback to outcome, then rawData
    let outcomeToCheck = actualOutcome || outcome
    if (!outcomeToCheck && rawData && typeof rawData === "object") {
      const raw = rawData as any
      // Check outcome field first
      outcomeToCheck = raw.outcome || null
      // Then check dispute_outcome.outcome_code (PayPal API format)
      if (!outcomeToCheck && raw.dispute_outcome) {
        if (typeof raw.dispute_outcome === "object" && raw.dispute_outcome.outcome_code) {
          outcomeToCheck = raw.dispute_outcome.outcome_code
        } else if (typeof raw.dispute_outcome === "string") {
          outcomeToCheck = raw.dispute_outcome
        }
      }
    }
    
    const { type, label } = getOutcomeDisplay(outcomeToCheck)
    
    // Debug logging for outcome display
    if (process.env.NODE_ENV === "development") {
      const raw = rawData && typeof rawData === "object" ? (rawData as any) : null
      console.log("[StatusBadge] getOutcomeDisplay result:", {
        actualOutcome,
        outcome,
        outcomeToCheck,
        type,
        label,
        rawDataOutcome: raw?.outcome || null,
        rawDataDisputeOutcome: raw?.dispute_outcome || null,
        rawDataDisputeOutcomeCode: raw?.dispute_outcome?.outcome_code || null,
      })
    }
    
    // If we have a valid outcome, show Won/Lost/Cancelled/Refunded/Offer Accepted badge
    if (type === "won") {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
          <Trophy className="h-3 w-3" />
          {label}
        </Badge>
      )
    }
    
    if (type === "lost") {
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1">
          <XCircle className="h-3 w-3" />
          {label}
        </Badge>
      )
    }
    
    if (type === "cancelled") {
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600 text-white gap-1">
          <Ban className="h-3 w-3" />
          {label}
        </Badge>
      )
    }

    if (type === "refunded") {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600 text-white gap-1">
          <DollarSign className="h-3 w-3" />
          {label}
        </Badge>
      )
    }

    if (type === "offer_accepted") {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {label}
        </Badge>
      )
    }
    
    // If resolved but no outcome, show "Resolved" as fallback
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white">
        Resolved
      </Badge>
    )
  }

  return <Badge variant="outline">{status}</Badge>
}


