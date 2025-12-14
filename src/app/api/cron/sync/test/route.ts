import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { AutoSyncService } from "@/lib/services/auto-sync"

/**
 * POST /api/cron/sync/test
 * Test endpoint to manually trigger auto sync (admin only)
 * This bypasses the frequency check and runs sync immediately
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can trigger test sync
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Force run sync by temporarily clearing lastAutoSyncCheck
    const { prisma } = await import("@/lib/db/prisma")
    
    // Get current settings
    const settings = await prisma.setting.findMany({
      where: { category: "sync" },
    })

    const syncSettings: Record<string, string> = {}
    settings.forEach((setting) => {
      syncSettings[setting.key] = setting.value || ""
    })

    const autoSyncEnabled = syncSettings.autoSyncEnabled === "true"

    if (!autoSyncEnabled) {
      return NextResponse.json({
        success: false,
        message: "Auto sync is disabled. Please enable it in Settings first.",
      })
    }

    // Clear lastAutoSyncCheck to force immediate sync
    await prisma.setting.deleteMany({
      where: { key: "lastAutoSyncCheck" },
    })

    // Run sync
    const result = await AutoSyncService.checkAndRunAutoSync()

    return NextResponse.json({
      success: result.ran,
      message: result.message,
      results: result.results,
      note: "This was a test run. Auto sync will continue to run on schedule.",
    })
  } catch (error) {
    console.error("[Auto Sync Test] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run test sync",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/sync/test
 * Check endpoint status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    return NextResponse.json({
      status: "ok",
      endpoint: "/api/cron/sync/test",
      authenticated: !!session?.user,
      isAdmin: session?.user?.role === "admin",
      message: session?.user
        ? session.user.role === "admin"
          ? "You can POST to this endpoint to test auto sync"
          : "Only admin users can trigger test sync"
        : "Please log in first to use this endpoint",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

