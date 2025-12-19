"use client"

import { Badge } from "@/components/ui/badge"
import { Trophy, XCircle, Ban } from "lucide-react"

interface StatusBadgeProps {
  status: string | null
  outcome?: string | null
}

/**
 * Determine the display outcome from PayPal outcome string
 */
function getOutcomeDisplay(outcome: string | null | undefined): {
  type: "won" | "lost" | "cancelled" | null
  label: string
} {
  if (!outcome || outcome.trim() === "") {
    return { type: null, label: "" }
  }

  const outcomeUpper = outcome.toUpperCase().trim()

  // Seller won - dispute resolved in seller's favor
  if (
    outcomeUpper.includes("SELLER_FAVOUR") ||
    outcomeUpper.includes("SELLER_FAVOR") ||
    outcomeUpper.includes("SELLER_WIN") ||
    outcomeUpper.includes("RESOLVED_SELLER") ||
    (outcomeUpper.includes("SELLER") && outcomeUpper.includes("FAVOR")) ||
    outcomeUpper === "SELLER_WON" ||
    outcomeUpper === "WON" ||
    outcomeUpper === "SELLER"
  ) {
    return { type: "won", label: "Won" }
  }

  // Seller lost - dispute resolved in buyer's favor
  if (
    outcomeUpper.includes("BUYER_FAVOUR") ||
    outcomeUpper.includes("BUYER_FAVOR") ||
    outcomeUpper.includes("BUYER_WIN") ||
    outcomeUpper.includes("RESOLVED_BUYER") ||
    (outcomeUpper.includes("BUYER") && outcomeUpper.includes("FAVOR")) ||
    outcomeUpper === "BUYER_WON" ||
    outcomeUpper === "LOST" ||
    outcomeUpper === "BUYER"
  ) {
    return { type: "lost", label: "Lost" }
  }

  // Cancelled/Withdrawn
  if (
    outcomeUpper.includes("CANCEL") ||
    outcomeUpper.includes("WITHDRAWN") ||
    outcomeUpper === "CANCELLED" ||
    outcomeUpper === "CANCELED"
  ) {
    return { type: "cancelled", label: "Cancelled" }
  }

  return { type: null, label: "" }
}

export function StatusBadge({ status, outcome }: StatusBadgeProps) {
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
    const { type, label } = getOutcomeDisplay(outcome)
    
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


