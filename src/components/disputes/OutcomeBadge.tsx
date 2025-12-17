"use client"

import { Badge } from "@/components/ui/badge"

interface OutcomeBadgeProps {
  outcome: string | null
  rawData?: any
  disputeStatus?: string | null
}

/**
 * Helper function to extract actual outcome from dispute
 */
function getActualOutcome(outcome: string | null, rawData?: any): string | null {
  // If outcome exists and is not just "RESOLVED" or "CLOSED", use it
  if (outcome && 
      outcome.trim() !== "" &&
      outcome.toUpperCase() !== "RESOLVED" &&
      outcome.toUpperCase() !== "CLOSED") {
    return outcome
  }
  
  // Try to extract from rawData if available
  if (rawData && typeof rawData === 'object') {
    const raw = rawData as any
    
    // Check for outcome field in rawData (most common)
    if (raw.outcome && 
        typeof raw.outcome === 'string' &&
        raw.outcome.trim() !== "" &&
        raw.outcome.toUpperCase() !== "RESOLVED" &&
        raw.outcome.toUpperCase() !== "CLOSED") {
      return raw.outcome
    }
    
    // Check for dispute_outcome field (alternative format)
    if (raw.dispute_outcome && 
        typeof raw.dispute_outcome === 'string' &&
        raw.dispute_outcome.trim() !== "" &&
        raw.dispute_outcome.toUpperCase() !== "RESOLVED" &&
        raw.dispute_outcome.toUpperCase() !== "CLOSED") {
      return raw.dispute_outcome
    }
    
    // Check for adjudications
    if (raw.adjudications && Array.isArray(raw.adjudications) && raw.adjudications.length > 0) {
      const lastAdjudication = raw.adjudications[raw.adjudications.length - 1]
      if (lastAdjudication.type && lastAdjudication.type.toUpperCase() !== "RESOLVED") {
        return lastAdjudication.type
      }
    }
  }
  
  return null
}

/**
 * Determine if dispute is Won, Lost, or Cancelled based on outcome
 */
function determineOutcomeType(outcome: string | null, rawData?: any, disputeStatus?: string | null): "won" | "lost" | "cancelled" | null {
  const actualOutcome = getActualOutcome(outcome, rawData)
  
  // Check if dispute is resolved
  const isResolved = disputeStatus?.toUpperCase() === "RESOLVED" || 
                     disputeStatus?.toUpperCase() === "CLOSED"
  
  if (!actualOutcome || actualOutcome.trim() === "") {
    // If resolved but no outcome, consider it cancelled/unknown
    if (isResolved) {
      return "cancelled"
    }
    return null
  }
  
  const outcomeUpper = actualOutcome.toUpperCase().trim()
  
  // Check for buyer win indicators (seller lost)
  const isBuyerWin = (
    outcomeUpper.includes("PAYOUT_TO_BUYER") ||
    outcomeUpper.includes("BUYER_WIN") ||
    outcomeUpper.includes("RESOLVED_BUYER_FAVOR") ||
    outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOR") ||
    outcomeUpper.includes("BUYER_FAVOR") ||
    outcomeUpper.includes("FAVOR_BUYER") ||
    outcomeUpper === "REFUNDED" ||
    outcomeUpper === "REFUND" ||
    (outcomeUpper.includes("BUYER") && 
     (outcomeUpper.includes("WON") || 
      outcomeUpper.includes("FAVOR") ||
      outcomeUpper.includes("FAVOUR")))
  )
  
  if (isBuyerWin) {
    return "lost"
  }
  
  // Check for seller win indicators
  const isWon = (
    outcomeUpper.includes("SELLER") ||
    outcomeUpper === "WON" ||
    outcomeUpper === "RESOLVED_SELLER_FAVOR" ||
    outcomeUpper === "SELLER_WIN" ||
    outcomeUpper === "RESOLVED_IN_SELLER_FAVOR" ||
    outcomeUpper.includes("SELLER_FAVOR") ||
    outcomeUpper.includes("FAVOR_SELLER") ||
    outcomeUpper === "SELLER_FAVORABLE" ||
    outcomeUpper === "FAVORABLE_TO_SELLER" ||
    outcomeUpper === "SELLER_FAVOUR" ||
    outcomeUpper.includes("SELLER_FAVOUR") ||
    outcomeUpper === "RESOLVED_SELLER_FAVOUR" ||
    // Check for negative buyer indicators (if buyer lost, seller won)
    (outcomeUpper.includes("BUYER") && 
     (outcomeUpper.includes("LOST") || 
      outcomeUpper.includes("DENIED") || 
      outcomeUpper.includes("REJECTED")))
  )
  
  if (isWon) {
    return "won"
  }
  
  // If resolved but outcome doesn't match known patterns, consider cancelled
  if (isResolved) {
    return "cancelled"
  }
  
  return null
}

export function OutcomeBadge({ outcome, rawData, disputeStatus }: OutcomeBadgeProps) {
  const outcomeType = determineOutcomeType(outcome, rawData, disputeStatus)
  
  if (!outcomeType) {
    return null
  }
  
  if (outcomeType === "won") {
    return (
      <Badge className="bg-green-600 hover:bg-green-700 text-white">
        Won
      </Badge>
    )
  }
  
  if (outcomeType === "lost") {
    return (
      <Badge className="bg-red-600 hover:bg-red-700 text-white">
        Lost
      </Badge>
    )
  }
  
  if (outcomeType === "cancelled") {
    return (
      <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white">
        Cancelled
      </Badge>
    )
  }
  
  return null
}

