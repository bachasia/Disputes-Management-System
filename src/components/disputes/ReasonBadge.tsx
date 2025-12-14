"use client"

import { Badge } from "@/components/ui/badge"

interface ReasonBadgeProps {
  reason: string | null
}

export function ReasonBadge({ reason }: ReasonBadgeProps) {
  if (!reason) {
    return <Badge variant="outline">N/A</Badge>
  }

  const reasonUpper = reason.toUpperCase()

  if (reasonUpper.includes("NOT_RECEIVED")) {
    return (
      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
        Not Received
      </Badge>
    )
  }
  if (reasonUpper.includes("NOT_AS_DESCRIBED")) {
    return (
      <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
        Not as Described
      </Badge>
    )
  }
  if (reasonUpper.includes("UNAUTHORISED") || reasonUpper.includes("UNAUTHORIZED")) {
    return (
      <Badge className="bg-pink-500 hover:bg-pink-600 text-white">
        Unauthorised
      </Badge>
    )
  }
  if (reasonUpper.includes("CREDIT")) {
    return (
      <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">
        Credit Issue
      </Badge>
    )
  }

  return <Badge variant="outline">{reason}</Badge>
}

