"use client"

import * as React from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  name?: string | null
  email?: string | null
  image?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

export function UserAvatar({
  name,
  email,
  image,
  className,
  size = "md",
}: UserAvatarProps) {
  const initials = React.useMemo(() => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }, [name, email])

  if (image) {
    return (
      <img
        src={image}
        alt={name || email || "User"}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium",
        sizeClasses[size],
        className
      )}
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  )
}


