"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  User,
  Settings,
  Users,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "./UserAvatar"
import { RoleBadge } from "./RoleBadge"
import { getLoginUrl } from "@/lib/utils/auth"

export function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Use absolute URL to ensure no port is included in production
      const loginUrl = getLoginUrl()
      await signOut({
        callbackUrl: loginUrl,
        redirect: true,
      })
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!session?.user) {
    // Show login button if not authenticated
    return (
      <Button
        variant="outline"
        onClick={() => router.push("/login")}
        className="gap-2"
      >
        <User className="h-4 w-4" />
        <span className="hidden md:inline">Login</span>
      </Button>
    )
  }

  const user = session.user
  const isAdmin = user.role === "admin"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 px-2 py-1.5 hover:bg-accent"
        >
          <UserAvatar
            name={user.name || undefined}
            email={user.email || undefined}
            size="sm"
          />
          <div className="hidden flex-col items-start text-left md:flex">
            <span className="text-sm font-medium">
              {user.name || user.email || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {user.name || "User"}
              </p>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/admin/users")}
              className="cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4" />
              User Management
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoading}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

