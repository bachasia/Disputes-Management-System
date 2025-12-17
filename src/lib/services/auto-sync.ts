import { prisma } from "@/lib/db/prisma"
import { disputeSyncService } from "./sync-service"

/**
 * Auto Sync Service
 * Handles automatic synchronization based on settings
 */
export class AutoSyncService {
  /**
   * Check and run auto sync if conditions are met
   * This should be called periodically (e.g., every 15 minutes)
   */
  static async checkAndRunAutoSync(): Promise<{
    ran: boolean
    message: string
    results?: any
  }> {
    try {
      // Get auto sync settings
      const settings = await prisma.setting.findMany({
        where: {
          category: "sync",
        },
      })

      const syncSettings: Record<string, string> = {}
      settings.forEach((setting) => {
        syncSettings[setting.key] = setting.value || ""
      })

      const autoSyncEnabled = syncSettings.autoSyncEnabled === "true"
      const syncFrequency = parseInt(syncSettings.syncFrequency || "30", 10)
      const syncType = (syncSettings.syncType as "incremental" | "90days" | "full") || "incremental"
      const syncTime = syncSettings.syncTime || "00:00"

      if (!autoSyncEnabled) {
        return {
          ran: false,
          message: "Auto sync is disabled",
        }
      }

      // Check if we should run based on frequency
      const now = new Date()
      const lastSyncCheck = await prisma.setting.findUnique({
        where: { key: "lastAutoSyncCheck" },
      })

      // For daily sync, check time
      if (syncFrequency === 1440) {
        const [hours, minutes] = syncTime.split(":").map(Number)
        const syncHour = hours || 0
        const syncMinute = minutes || 0
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()

        // Only run if current time matches sync time (within 5 minute window)
        if (currentHour !== syncHour || Math.abs(currentMinute - syncMinute) > 5) {
          return {
            ran: false,
            message: `Auto sync scheduled for ${syncTime}, current time is ${currentHour}:${currentMinute}`,
          }
        }
      } else {
        // For interval-based sync, check last run time
        if (lastSyncCheck?.value) {
          const lastCheckTime = new Date(lastSyncCheck.value)
          const minutesSinceLastCheck =
            (now.getTime() - lastCheckTime.getTime()) / (1000 * 60)

          if (minutesSinceLastCheck < syncFrequency) {
            return {
              ran: false,
              message: `Last sync was ${Math.round(minutesSinceLastCheck)} minutes ago, next sync in ${Math.round(syncFrequency - minutesSinceLastCheck)} minutes`,
            }
          }
        }
      }

      console.log(`[Auto Sync] Starting auto sync at ${now.toISOString()}`)
      console.log(`[Auto Sync] Settings: syncType=${syncType}, frequency=${syncFrequency} minutes`)

      // Update last check time
      await prisma.setting.upsert({
        where: { key: "lastAutoSyncCheck" },
        update: {
          value: now.toISOString(),
          category: "sync",
        },
        create: {
          key: "lastAutoSyncCheck",
          value: now.toISOString(),
          category: "sync",
        },
      })

      // Trigger sync for all active accounts
      const results = await disputeSyncService.syncAllAccounts(syncType)

      const successCount = results.filter((r) => r.success).length
      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
      const failedAccounts = results.filter((r) => !r.success)

      console.log(
        `[Auto Sync] Completed: ${successCount}/${results.length} accounts synced, ${totalSynced} total disputes`
      )

      return {
        ran: true,
        message: `Auto sync completed: ${totalSynced} disputes synced across ${successCount}/${results.length} accounts`,
        results: {
          totalAccounts: results.length,
          successCount,
          failedCount: failedAccounts.length,
          totalSynced,
          accounts: results,
        },
      }
    } catch (error) {
      console.error("[Auto Sync] Error:", error)
      return {
        ran: false,
        message: `Auto sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Run sync on startup if enabled
   */
  static async runSyncOnStartup(): Promise<void> {
    try {
      const settings = await prisma.setting.findMany({
        where: {
          category: "sync",
        },
      })

      const syncSettings: Record<string, string> = {}
      settings.forEach((setting) => {
        syncSettings[setting.key] = setting.value || ""
      })

      const syncOnStartup = syncSettings.syncOnStartup === "true"
      const syncType = (syncSettings.syncType as "incremental" | "90days" | "full") || "incremental"

      if (syncOnStartup) {
        console.log(`[Auto Sync] Running sync on startup at ${new Date().toISOString()}`)
        await disputeSyncService.syncAllAccounts(syncType)
        console.log(`[Auto Sync] Startup sync completed`)
      }
    } catch (error) {
      console.error("[Auto Sync] Startup sync error:", error)
    }
  }
}


