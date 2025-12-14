import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

// Force dynamic rendering (uses headers() from NextAuth)
export const dynamic = 'force-dynamic'

// GET /api/settings/sync - Get sync settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sync settings from system settings (admin) or user preferences
    const isAdmin = session.user.role === "admin"

    if (isAdmin) {
      const settings = await prisma.setting.findMany({
        where: {
          category: "sync",
        },
      })

      const syncSettings: Record<string, string> = {}
      settings.forEach((setting) => {
        syncSettings[setting.key] = setting.value || ""
      })

      // Return defaults if no settings exist
      return NextResponse.json({
        autoSyncEnabled: syncSettings.autoSyncEnabled === "true",
        syncFrequency: syncSettings.syncFrequency || "30",
        syncTime: syncSettings.syncTime || "00:00",
        syncAllAccounts: syncSettings.syncAllAccounts !== "false",
        syncOnStartup: syncSettings.syncOnStartup === "true",
        syncFailureAlerts: syncSettings.syncFailureAlerts !== "false",
        syncType: syncSettings.syncType || "incremental",
      })
    } else {
      // For non-admin users, return defaults or user-specific preferences
      return NextResponse.json({
        autoSyncEnabled: false, // Non-admin can't control auto sync
        syncFrequency: "30",
        syncTime: "00:00",
        syncAllAccounts: true,
        syncOnStartup: false,
        syncFailureAlerts: true,
        syncType: "incremental",
      })
    }
  } catch (error) {
    console.error("Error fetching sync settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch sync settings" },
      { status: 500 }
    )
  }
}

// PUT /api/settings/sync - Update sync settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can update sync settings
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      autoSyncEnabled,
      syncFrequency,
      syncTime,
      syncAllAccounts,
      syncOnStartup,
      syncFailureAlerts,
      syncType,
    } = body

    const settings = [
      {
        key: "autoSyncEnabled",
        value: String(autoSyncEnabled || false),
        category: "sync",
      },
      {
        key: "syncFrequency",
        value: String(syncFrequency || "30"),
        category: "sync",
      },
      {
        key: "syncTime",
        value: String(syncTime || "00:00"),
        category: "sync",
      },
      {
        key: "syncAllAccounts",
        value: String(syncAllAccounts !== false),
        category: "sync",
      },
      {
        key: "syncOnStartup",
        value: String(syncOnStartup || false),
        category: "sync",
      },
      {
        key: "syncFailureAlerts",
        value: String(syncFailureAlerts !== false),
        category: "sync",
      },
      {
        key: "syncType",
        value: String(syncType || "incremental"),
        category: "sync",
      },
    ]

    const updates = settings.map((setting) =>
      prisma.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedBy: session.user.email || "unknown",
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
          updatedBy: session.user.email || "unknown",
        },
      })
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating sync settings:", error)
    return NextResponse.json(
      { error: "Failed to update sync settings" },
      { status: 500 }
    )
  }
}

