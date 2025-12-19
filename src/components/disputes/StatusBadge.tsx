"use client"

import { Badge } from "@/components/ui/badge"
import { Trophy, XCircle, Ban, CheckCircle2, DollarSign } from "lucide-react"

interface StatusBadgeProps {
  status: string | null
  outcome?: string | null
  rawData?: any
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
  if (status && typeof status === "string") {
    const statusUpper = status.toUpperCase().trim()
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
  if (outcome && typeof outcome === "string") {
    const outcomeUpper = outcome.toUpperCase().trim()
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
  if (
    outcome &&
    typeof outcome === "string" &&
    outcome.trim() !== "" &&
    outcome.toUpperCase() !== "RESOLVED" &&
    outcome.toUpperCase() !== "CLOSED"
  ) {
    return outcome
  }

  // Try to extract from rawData if available
  if (rawData && typeof rawData === "object") {
    const raw = rawData as any

    // Check for outcome field in rawData (most common)
    if (
      raw.outcome &&
      typeof raw.outcome === "string" &&
      raw.outcome.trim() !== "" &&
      raw.outcome.toUpperCase() !== "RESOLVED" &&
      raw.outcome.toUpperCase() !== "CLOSED"
    ) {
      return raw.outcome
    }

    // Check for dispute_outcome field (alternative format)
    if (
      raw.dispute_outcome &&
      typeof raw.dispute_outcome === "string" &&
      raw.dispute_outcome.trim() !== "" &&
      raw.dispute_outcome.toUpperCase() !== "RESOLVED" &&
      raw.dispute_outcome.toUpperCase() !== "CLOSED"
    ) {
      return raw.dispute_outcome
    }

    // Check for other possible outcome indicators
    if (
      raw.adjudications &&
      Array.isArray(raw.adjudications) &&
      raw.adjudications.length > 0
    ) {
      const lastAdjudication = raw.adjudications[raw.adjudications.length - 1]
      if (
        lastAdjudication.type &&
        typeof lastAdjudication.type === "string" &&
        lastAdjudication.type.toUpperCase() !== "RESOLVED"
      ) {
        return lastAdjudication.type
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
 */
function isRefunded(outcome: string | null | undefined, rawData: any): boolean {
  // Check explicit outcome first
  if (outcome && typeof outcome === "string") {
    const outcomeUpper = outcome.toUpperCase().trim()
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
    if (rawOutcome && typeof rawOutcome === "string") {
      const outcomeUpper = rawOutcome.toUpperCase().trim()
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

    // Check if dispute was resolved by accepting claim (full refund)
    // This is indicated by status being RESOLVED and no specific outcome
    // but we can check history or other indicators
    if (raw.status === "RESOLVED" || raw.dispute_state === "RESOLVED") {
      // If there's no explicit outcome but status is RESOLVED,
      // and we have refund_details, it might be a refund
      // But we should be careful - only if outcome is missing
      if (!rawOutcome && raw.refund_details) {
        // Check if there's an allowed refund amount
        if (raw.refund_details.allowed_refund_amount) {
          return true
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
 */
function isOfferAccepted(outcome: string | null | undefined, rawData: any): boolean {
  if (outcome && typeof outcome === "string") {
    const outcomeUpper = outcome.toUpperCase().trim()
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
    if (rawOutcome && typeof rawOutcome === "string") {
      const outcomeUpper = rawOutcome.toUpperCase().trim()
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
    
    // Check if offer exists and has accepted status or seller offered amount
    if (raw.offer) {
      const offer = raw.offer
      
      // Check offer status
      if (offer.status && typeof offer.status === "string") {
        const offerStatus = offer.status.toUpperCase().trim()
        if (
          offerStatus === "ACCEPTED" || 
          offerStatus.includes("ACCEPTED") ||
          offerStatus === "ACCEPTED_BY_BUYER"
        ) {
          return true
        }
      }
      
      // Check if seller_offered_amount exists and dispute is resolved
      // This indicates an offer was made and likely accepted if resolved
      if (
        (raw.status === "RESOLVED" || raw.dispute_state === "RESOLVED") &&
        offer.seller_offered_amount &&
        offer.seller_offered_amount.value
      ) {
        // If there's a seller offered amount and dispute is resolved,
        // and no explicit outcome indicating refund or win/loss,
        // it's likely the offer was accepted
        const hasOtherOutcome = rawOutcome && 
          (rawOutcome.toUpperCase().includes("REFUND") ||
           rawOutcome.toUpperCase().includes("WON") ||
           rawOutcome.toUpperCase().includes("LOST") ||
           rawOutcome.toUpperCase().includes("SELLER") ||
           rawOutcome.toUpperCase().includes("BUYER"))
        
        if (!hasOtherOutcome) {
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
  if (!outcome || typeof outcome !== "string" || outcome.trim() === "") {
    return { type: null, label: "" }
  }

  const outcomeUpper = outcome.toUpperCase().trim()

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
  if (
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
  // Exclude REFUNDED as it's now a separate status
  const isBuyerWin =
    outcomeUpper.includes("PAYOUT_TO_BUYER") ||
    outcomeUpper.includes("BUYER_WIN") ||
    outcomeUpper.includes("RESOLVED_BUYER_FAVOR") ||
    outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOR") ||
    outcomeUpper.includes("RESOLVED_BUYER_FAVOUR") ||
    outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOUR") ||
    outcomeUpper.includes("BUYER_FAVOR") ||
    outcomeUpper.includes("BUYER_FAVOUR") ||
    outcomeUpper.includes("FAVOR_BUYER") ||
    outcomeUpper.includes("FAVOUR_BUYER") ||
    (outcomeUpper.includes("BUYER") &&
      (outcomeUpper.includes("WON") ||
        outcomeUpper.includes("FAVOR") ||
        outcomeUpper.includes("FAVOUR"))) ||
    outcomeUpper === "LOST" ||
    outcomeUpper === "BUYER"

  if (isBuyerWin) {
    return { type: "lost", label: "Lost" }
  }

  // Check for seller win indicators
  const isSellerWin =
    outcomeUpper.includes("SELLER") ||
    outcomeUpper === "WON" ||
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

  const statusUpper = status.toUpperCase()

  if (statusUpper === "OPEN") {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
        Open
      </Badge>
    )
  }
  if (statusUpper.includes("WAITING")) {
    return (
      <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
        Waiting
      </Badge>
    )
  }
  if (statusUpper.includes("REVIEW")) {
    return (
      <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
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
    if (isRefunded(outcome, rawData) || isRefunded(actualOutcome, rawData)) {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600 text-white gap-1">
          <DollarSign className="h-3 w-3" />
          Refunded
        </Badge>
      )
    }

    // Check for offer accepted (from outcome or rawData) - check BEFORE won/lost
    // Use both outcome and actualOutcome for better detection
    if (isOfferAccepted(outcome, rawData) || isOfferAccepted(actualOutcome, rawData)) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Offer Accepted
        </Badge>
      )
    }

    // Now check for Won/Lost/Cancelled using outcome display
    const { type, label } = getOutcomeDisplay(actualOutcome)
    
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


