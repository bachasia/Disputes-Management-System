"use client"

import { Badge } from "@/components/ui/badge"
import { Trophy, XCircle, Ban } from "lucide-react"

interface OutcomeBadgeProps {
  outcome: string | null | undefined
  status?: string | null
}

/**
 * Determine the display outcome from PayPal outcome string
 * PayPal outcomes include: RESOLVED_BUYER_FAVOUR, RESOLVED_SELLER_FAVOUR, 
 * CANCELED_BY_BUYER, etc.
 */
function getOutcomeDisplay(outcome: string | null | undefined): {
  type: "won" | "lost" | "cancelled" | null
  label: string
} {
  if (!outcome) {
    return { type: null, label: "" }
  }

  const outcomeUpper = outcome.toUpperCase()

  // Seller won - dispute resolved in seller's favor
  if (
    outcomeUpper.includes("SELLER_FAVOUR") ||
    outcomeUpper.includes("SELLER_FAVOR") ||
    outcomeUpper.includes("SELLER_WIN") ||
    outcomeUpper.includes("RESOLVED_SELLER") ||
    outcomeUpper === "SELLER_WON" ||
    outcomeUpper === "WON"
  ) {
    return { type: "won", label: "Won" }
  }

  // Seller lost - dispute resolved in buyer's favor
  if (
    outcomeUpper.includes("BUYER_FAVOUR") ||
    outcomeUpper.includes("BUYER_FAVOR") ||
    outcomeUpper.includes("BUYER_WIN") ||
    outcomeUpper.includes("RESOLVED_BUYER") ||
    outcomeUpper === "BUYER_WON" ||
    outcomeUpper === "LOST"
  ) {
    return { type: "lost", label: "Lost" }
  }

  // Cancelled/Withdrawn
  if (
    outcomeUpper.includes("CANCEL") ||
    outcomeUpper.includes("WITHDRAWN") ||
    outcomeUpper.includes("CLOSED") ||
    outcomeUpper === "CANCELLED" ||
    outcomeUpper === "CANCELED"
  ) {
    return { type: "cancelled", label: "Cancelled" }
  }

  // If outcome exists but doesn't match known patterns, show it as-is
  return { type: null, label: "" }
}

export function OutcomeBadge({ outcome, status }: OutcomeBadgeProps) {
  // Only show outcome badge for resolved disputes
  const statusUpper = status?.toUpperCase() || ""
  if (statusUpper !== "RESOLVED" && statusUpper !== "CLOSED") {
    return null
  }

  const { type, label } = getOutcomeDisplay(outcome)

  if (!type) {
    // No recognized outcome - don't show badge
    return null
  }

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

  return null
}
