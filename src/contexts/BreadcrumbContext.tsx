"use client"

import * as React from "react"

interface BreadcrumbContextType {
  setLastBreadcrumbLabel: (label: string | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType | undefined>(
  undefined
)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [lastBreadcrumbLabel, setLastBreadcrumbLabel] = React.useState<
    string | null
  >(null)

  return (
    <BreadcrumbContext.Provider value={{ setLastBreadcrumbLabel }}>
      {children}
      <BreadcrumbLabelSetter label={lastBreadcrumbLabel} />
    </BreadcrumbContext.Provider>
  )
}

// Internal component to set label via global state
function BreadcrumbLabelSetter({ label }: { label: string | null }) {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__lastBreadcrumbLabel = label
    }
  }, [label])
  return null
}

export function useBreadcrumb() {
  const context = React.useContext(BreadcrumbContext)
  if (!context) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider")
  }
  return context
}

// Helper to get label from window (used in layout)
export function getLastBreadcrumbLabel(): string | null {
  if (typeof window === "undefined") return null
  return (window as any).__lastBreadcrumbLabel || null
}

