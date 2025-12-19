"use client"

import { Badge } from "@/components/ui/badge"
import { Trophy, XCircle, Ban } from "lucide-react"

interface StatusBadgeProps {
  status: string | null
  outcome?: string | null
  rawData?: any
}

/**
 * Extract actual outcome from disputeOutcome or rawData
 */
function getActualOutcome(outcome: string | null | undefined, rawData: any): string | null {
  // If outcome exists and is not just "RESOLVED" or "CLOSED", use it
  if (
    outcome &&
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
        lastAdjudication.type.toUpperCase() !== "RESOLVED"
      ) {
        return lastAdjudication.type
      }
    }
  }

  return null
}

/**
 * Determine the display outcome from PayPal outcome string
 * This matches the logic in stats API for consistency
 */
function getOutcomeDisplay(outcome: string | null | undefined): {
  type: "won" | "lost" | "cancelled" | null
  label: string
} {
  if (!outcome || outcome.trim() === "") {
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

  // Check for buyer win indicators (if buyer won, seller lost)
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
    outcomeUpper === "REFUNDED" ||
    outcomeUpper === "REFUND" ||
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
  
  // For RESOLVED or CLOSED status, show Won/Lost/Cancelled if outcome is available
  if (statusUpper === "RESOLVED" || statusUpper === "CLOSED") {
    // Extract actual outcome from disputeOutcome or rawData
    const actualOutcome = getActualOutcome(outcome, rawData)
    const { type, label } = getOutcomeDisplay(actualOutcome)
    
    // If we have a valid outcome, show Won/Lost/Cancelled badge
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
    
    // If resolved but no outcome, show "Resolved" as fallback
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white">
        Resolved
      </Badge>
    )
  }

  return <Badge variant="outline">{status}</Badge>
}


