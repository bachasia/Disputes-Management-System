import { NextRequest, NextResponse } from "next/server"
import { disputeSyncService } from "@/lib/services/sync-service"
import { checkWritePermission } from "@/lib/auth/role-check"

interface SyncRequest {
  account_id?: string
  syncType?: "incremental" | "90days" | "full" // Sync type: incremental (default), 90days, or full
  // Legacy support: fullSync will be converted to syncType
  fullSync?: boolean
}

interface SyncResponse {
  success: boolean
  message: string
  results?: any
}

/**
 * POST /api/disputes/sync
 * Trigger sync for specific account or all accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const body: SyncRequest = await request.json().catch(() => ({}))
    const { account_id, syncType, fullSync } = body

    // Convert legacy fullSync to syncType
    let finalSyncType: "incremental" | "90days" | "full" = syncType || "incremental"
    if (fullSync !== undefined && !syncType) {
      // Legacy support: fullSync = true means "full", false means "incremental"
      finalSyncType = fullSync ? "full" : "incremental"
    }

    // If account_id is provided, sync specific account
    if (account_id) {
      const result = await disputeSyncService.syncAccount(account_id, finalSyncType)

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            message: `Successfully synced ${result.synced} disputes for account ${account_id}`,
            results: {
              accountId: account_id,
              synced: result.synced,
            },
          } as SyncResponse,
          { status: 200 }
        )
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Failed to sync account ${account_id}`,
            results: {
              accountId: account_id,
              synced: result.synced,
              errors: result.errors,
            },
          } as SyncResponse,
          { status: 500 }
        )
      }
    }

    // Otherwise, sync all active accounts
    const results = await disputeSyncService.syncAllAccounts(finalSyncType)

    const successCount = results.filter((r) => r.success).length
    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
    const failedAccounts = results.filter((r) => !r.success)

    return NextResponse.json(
      {
        success: failedAccounts.length === 0,
        message: `Synced ${totalSynced} disputes across ${successCount}/${results.length} accounts`,
        results: {
          totalAccounts: results.length,
          successCount,
          failedCount: failedAccounts.length,
          totalSynced,
          accounts: results,
        },
      } as SyncResponse,
      { status: failedAccounts.length === 0 ? 200 : 207 } // 207 Multi-Status if some failed
    )
  } catch (error) {
    console.error("Error syncing disputes:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync disputes",
        error: error instanceof Error ? error.message : "Unknown error",
      } as SyncResponse,
      { status: 500 }
    )
  }
}


