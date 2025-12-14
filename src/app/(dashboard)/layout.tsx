"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { PanelLeft, Loader2, Shield, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user/UserMenu"
import { Sidebar } from "@/components/layout/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [lastBreadcrumbLabel, setLastBreadcrumbLabel] = React.useState<
    string | null
  >(null)

  // Client-side protection as fallback
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Update breadcrumb label from window
  React.useEffect(() => {
    // Check for custom breadcrumb label from window
    const checkLabel = () => {
      if (typeof window !== "undefined") {
        const label = (window as any).__lastBreadcrumbLabel
        setLastBreadcrumbLabel(label || null)
      }
    }
    checkLabel()
    // Check periodically in case page sets it after mount
    const interval = setInterval(checkLabel, 100)
    return () => clearInterval(interval)
  }, [pathname])

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (status === "unauthenticated" || !session) {
    return null
  }

  // Get breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean)
    const breadcrumbs = [{ label: "Home", href: "/" }]

    let currentPath = ""
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      // Use custom label for last breadcrumb if available
      if (index === paths.length - 1 && lastBreadcrumbLabel) {
        breadcrumbs.push({ label: lastBreadcrumbLabel, href: currentPath })
      } else {
        const label = path
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
        breadcrumbs.push({ label, href: currentPath })
      }
    })

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transform border-r bg-white shadow-lg transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b px-4">
            <div className="flex items-center gap-2 w-full">
              <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex-1">
                  <h2 className="font-bold text-sm">PayPal Disputes</h2>
                  <p className="text-xs text-gray-500">Management System</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Content - no scrollbar */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-hide">
              <Sidebar isCollapsed={!sidebarOpen} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarOpen ? "lg:pl-64" : "lg:pl-16")}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6">
          {/* Toggle sidebar button - next to breadcrumbs */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>

            {/* Breadcrumbs */}
            <nav className="hidden items-center gap-2 text-sm md:flex">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <Link
                  href={crumb.href}
                  className={cn(
                    "transition-colors hover:text-foreground",
                    index === breadcrumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
            </nav>
          </div>

          {/* User Menu */}
          <UserMenu />
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>

        {/* Footer */}
        <footer className="sticky bottom-0 z-20 border-t bg-white px-4 py-5 lg:px-6">
          <div className="flex items-center justify-start text-sm text-muted-foreground">
            <span>
              2025 © Dispute Management | Crafted with{" "}
              <Heart className="inline h-4 w-4 text-red-500 fill-red-500" /> by DTC Team
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
