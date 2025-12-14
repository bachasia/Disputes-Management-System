"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  Users,
  Shield,
  LucideIcon,
} from "lucide-react"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  badge?: string
  addSpacing?: boolean
}

type DividerItem = {
  type: "divider"
  label?: string
  addSpacing?: boolean
}

interface SidebarProps {
  isCollapsed?: boolean
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  const navigation = [
    {
      name: "Dashboard",
      href: "/disputes",
      icon: LayoutDashboard,
    },
    {
      name: "PayPal Accounts",
      href: "/accounts",
      icon: CreditCard,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    // Admin only section
    ...(isAdmin
      ? [
          {
            type: "divider",
            addSpacing: true,
          },
          {
            name: "User Management",
            href: "/admin/users",
            icon: Users,
            addSpacing: true,
          },
        ]
      : []),
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      addSpacing: true,
    },
  ]

  return (
    <div className={cn("p-4", isCollapsed && "px-2")}>
      <nav className="space-y-1">
        {navigation.map((item, index) => {
          if (item.type === "divider") {
            const dividerItem = item as DividerItem
            if (isCollapsed) return null // Hide dividers when collapsed
            return (
              <div key={index} className={cn("my-8", dividerItem.addSpacing && "mt-10")}>
                {dividerItem.label && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {dividerItem.label}
                  </p>
                )}
                <hr className="border-gray-200" />
              </div>
            )
          }

          const navItem = item as NavItem
          const Icon = navItem.icon
          const isActive =
            pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)

          const linkContent = (
            <Link
              href={navItem.href}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              title={isCollapsed ? navItem.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span>{navItem.name}</span>
                  {navItem.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      {navItem.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )

          if (navItem.addSpacing && !isCollapsed) {
            return (
              <div key={navItem.name} className="mt-6">
                {linkContent}
              </div>
            )
          }

          return <div key={navItem.name}>{linkContent}</div>
        })}
      </nav>
    </div>
  )
}

