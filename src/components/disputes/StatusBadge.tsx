"use client"

import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string | null
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
  if (statusUpper === "RESOLVED") {
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white">
        Resolved
      </Badge>
    )
  }
  if (statusUpper === "CLOSED") {
    return (
      <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white">
        Closed
      </Badge>
    )
  }

  return <Badge variant="outline">{status}</Badge>
}


