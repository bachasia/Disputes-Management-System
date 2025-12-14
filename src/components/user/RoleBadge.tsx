"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
  role: string
  className?: string
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300",
  user: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300",
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleUpper = role?.toUpperCase() || "USER"
  const colorClass = roleColors[role?.toLowerCase() || "user"] || roleColors.user

  return (
    <Badge
      variant="secondary"
      className={cn("font-medium", colorClass, className)}
    >
      {roleUpper}
    </Badge>
  )
}

