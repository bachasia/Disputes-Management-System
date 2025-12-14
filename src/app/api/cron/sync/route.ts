import { NextRequest, NextResponse } from "next/server"
import { AutoSyncService } from "@/lib/services/auto-sync"

/**
 * POST /api/cron/sync
 * Auto sync endpoint - can be called by external cron service or Vercel Cron Jobs
 * 
 * This endpoint:
 * 1. Reads auto sync settings from database
 * 2. Checks if auto sync is enabled
 * 3. Checks if it's time to run based on frequency
 * 4. Triggers sync for all active accounts if conditions are met
 * 
 * Security: Should be protected by a secret token or API key
 * 
 * Usage with external cron:
 * - Set up a cron job to call POST /api/cron/sync every 15 minutes
 * - Include Authorization header: Bearer <CRON_SECRET>
 * 
 * Usage with Vercel Cron:
 * - Configure in vercel.json (already set up)
 * - Vercel will automatically call this endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization
    // For example, check for a secret token in headers
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Use AutoSyncService to check and run sync
    const result = await AutoSyncService.checkAndRunAutoSync()

    if (!result.ran) {
      return NextResponse.json({
        success: true,
        message: result.message,
        skipped: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      results: result.results,
    })
  } catch (error) {
    console.error("[Auto Sync] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run auto sync",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/sync
 * Health check endpoint - can be used to verify the cron endpoint is accessible
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db/prisma")
    const settings = await prisma.setting.findMany({
      where: {
        category: "sync",
      },
    })

    const syncSettings: Record<string, string> = {}
    settings.forEach((setting) => {
      syncSettings[setting.key] = setting.value || ""
    })

    const lastSyncCheck = await prisma.setting.findUnique({
      where: { key: "lastAutoSyncCheck" },
    })

    return NextResponse.json({
      status: "ok",
      autoSyncEnabled: syncSettings.autoSyncEnabled === "true",
      syncFrequency: syncSettings.syncFrequency || "30",
      syncType: syncSettings.syncType || "incremental",
      lastCheck: new Date().toISOString(),
      lastAutoSyncCheck: lastSyncCheck?.value || null,
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
