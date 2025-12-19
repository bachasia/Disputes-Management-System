"use client"

import { Badge } from "@/components/ui/badge"
import { PackageX, AlertTriangle, ShieldAlert, CreditCard, HelpCircle } from "lucide-react"

interface ReasonBadgeProps {
  reason: string | null
}

export function ReasonBadge({ reason }: ReasonBadgeProps) {
  if (!reason) {
    return (
      <Badge variant="outline" className="gap-1">
        <HelpCircle className="h-3 w-3" />
        N/A
      </Badge>
    )
  }

  const reasonUpper = reason.toUpperCase()

  if (reasonUpper.includes("NOT_RECEIVED")) {
    return (
      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 gap-1">
        <PackageX className="h-3 w-3" />
        Not Received
      </Badge>
    )
  }
  if (reasonUpper.includes("NOT_AS_DESCRIBED")) {
    return (
      <Badge className="bg-purple-500 hover:bg-purple-600 text-white gap-1">
        <AlertTriangle className="h-3 w-3" />
        Not as Described
      </Badge>
    )
  }
  if (reasonUpper.includes("UNAUTHORISED") || reasonUpper.includes("UNAUTHORIZED")) {
    return (
      <Badge className="bg-pink-500 hover:bg-pink-600 text-white gap-1">
        <ShieldAlert className="h-3 w-3" />
        Unauthorised
      </Badge>
    )
  }
  if (reasonUpper.includes("CREDIT")) {
    return (
      <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white gap-1">
        <CreditCard className="h-3 w-3" />
        Credit Issue
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1">
      <HelpCircle className="h-3 w-3" />
      {reason}
    </Badge>
  )
}


