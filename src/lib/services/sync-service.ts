import { prisma } from "@/lib/db/prisma"
import { PayPalClient, PayPalDisputesAPI, PayPalDispute } from "@/lib/paypal"
import { decrypt } from "@/lib/utils/encryption"
import { Decimal } from "@prisma/client/runtime/library"

interface SyncResult {
  success: boolean
  synced: number
  errors?: string
}

interface AccountSyncResult {
  accountId: string
  accountName: string
  success: boolean
  synced: number
  errors?: string
}

/**
 * Service for syncing PayPal disputes to database
 */
export class DisputeSyncService {
  /**
   * Sync disputes for a specific PayPal account
   * @param accountId - PayPal account ID
   * @param syncType - "incremental" | "90days" | "full"
   *   - "incremental": Only sync disputes updated since last sync
   *   - "90days": Sync disputes from last 90 days
   *   - "full": Sync all disputes from beginning (no time limit)
   */
  async syncAccount(accountId: string, syncType: "incremental" | "90days" | "full" = "incremental"): Promise<SyncResult> {
    const startedAt = new Date()
    let syncLogId: string | null = null
    let syncedCount = 0
    let updatedCount = 0

    try {
      // 1. Get account from database
      const account = await prisma.payPalAccount.findUnique({
        where: { id: accountId },
      })

      if (!account) {
        throw new Error(`PayPal account not found: ${accountId}`)
      }

      if (!account.active) {
        throw new Error(`PayPal account is not active: ${accountId}`)
      }

      // Determine sync start time
      let syncStartTime: Date | null = null
      const now = new Date()
      console.log(`[Sync] Current server time: ${now.toISOString()}, syncType: ${syncType}`)
      
      if (syncType === "full") {
        // For full sync, fetch all disputes (no time limit - don't set start_time)
        syncStartTime = null
        console.log(`[Sync] Full sync: fetching all disputes (no time limit)`)
      } else if (syncType === "90days") {
        // For 90 days sync, fetch disputes from last 90 days
        syncStartTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        console.log(`[Sync] 90 days sync: fetching disputes from last 90 days (since ${syncStartTime.toISOString()})`)
      } else if (account.lastSyncAt) {
        // For incremental sync, only fetch disputes updated since last sync
        const lastSyncDate = new Date(account.lastSyncAt)
        console.log(`[Sync] lastSyncAt from DB: ${lastSyncDate.toISOString()}, comparing with now: ${now.toISOString()}`)
        
        // Validate lastSyncAt is not in the future
        if (lastSyncDate > now) {
          // If lastSyncAt is in the future (timezone/system time issue), use 90 days ago
          console.warn(`[Sync] ⚠️ Warning: lastSyncAt (${lastSyncDate.toISOString()}) is in the future! Using 90 days ago instead.`)
          syncStartTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        } else {
          // Subtract 1 hour buffer to account for timezone differences and API delays
          syncStartTime = new Date(lastSyncDate.getTime() - 60 * 60 * 1000)
          // Ensure start time is not in the future
          if (syncStartTime > now) {
            console.warn(`[Sync] ⚠️ Warning: calculated syncStartTime (${syncStartTime.toISOString()}) is in the future! Using 1 hour ago instead.`)
            syncStartTime = new Date(now.getTime() - 60 * 60 * 1000)
          }
        }
        console.log(`[Sync] Incremental sync: fetching disputes updated after ${syncStartTime.toISOString()}`)
      } else {
        // First sync - no lastSyncAt, do full sync but mark as incremental for future
        syncStartTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        console.log(`[Sync] First sync (incremental mode): fetching disputes from last 90 days (since ${syncStartTime.toISOString()})`)
      }
      
      // Final validation: ensure syncStartTime is not in the future
      if (syncStartTime && syncStartTime > now) {
        console.error(`[Sync] ❌ Error: syncStartTime (${syncStartTime.toISOString()}) is still in the future! Using 90 days ago as fallback.`)
        syncStartTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      }
      
      console.log(`[Sync] Final syncStartTime: ${syncStartTime?.toISOString()}, is in future: ${syncStartTime && syncStartTime > now}`)

      // 2. Decrypt secret_key
      let clientId: string
      let secretKey: string

      try {
        clientId = decrypt(account.clientId)
        secretKey = decrypt(account.secretKey)
      } catch (error) {
        throw new Error(
          `Failed to decrypt credentials for account ${accountId}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }

      // 3. Create PayPalClient and PayPalDisputesAPI instance
      const paypalClient = new PayPalClient(
        clientId,
        secretKey,
        account.sandboxMode
      )
      const disputesAPI = new PayPalDisputesAPI(paypalClient)

      // 4. Create sync_log record with status 'RUNNING'
      const syncTypeMap = {
        incremental: "INCREMENTAL_SYNC",
        "90days": "90DAYS_SYNC",
        full: "FULL_SYNC",
      }
      const syncLog = await prisma.syncLog.create({
        data: {
          paypalAccountId: accountId,
          syncType: syncTypeMap[syncType],
          status: "RUNNING",
          startedAt,
        },
      })
      syncLogId = syncLog.id

      // 5. Fetch disputes from PayPal API (handle pagination)
      // PayPal API doesn't support 'page' parameter, use pagination links instead
      // Note: PayPal Disputes API has a maximum page_size of 20 (not 100)
      let nextPageUrl: string | null = null
      let pageNumber = 1
      const pageSize = 20 // PayPal Disputes API max is 20
      let allDisputes: PayPalDispute[] = []
      // Only calculate lastSyncTime for incremental sync filtering
      const lastSyncTime = (syncType === "incremental" && account.lastSyncAt) 
        ? new Date(account.lastSyncAt.getTime() - 60 * 60 * 1000) 
        : null

      while (true) {
        try {
          let response: Awaited<ReturnType<typeof disputesAPI.listDisputes>>

          if (nextPageUrl) {
            // Use pagination link from previous response
            // PayPal returns full URLs, extract the path and query
            let endpoint: string
            try {
              const url = new URL(nextPageUrl)
              endpoint = url.pathname + url.search
            } catch {
              // If it's already a relative path, use it directly
              endpoint = nextPageUrl.startsWith("/") ? nextPageUrl : `/${nextPageUrl}`
            }
            // Make request using the pagination link
            response = await paypalClient.request<Awaited<ReturnType<typeof disputesAPI.listDisputes>>>(
              "GET",
              endpoint
            )
          } else {
            // First page - use listDisputes with optional start_time
            const listParams: { page_size: number; start_time?: string } = {
              page_size: pageSize,
            }
            
            // Add start_time filter (for both incremental and full sync)
            // Only add if syncStartTime is valid and not in the future
            const currentTime = new Date()
            if (syncStartTime && syncStartTime <= currentTime) {
              // PayPal API expects ISO 8601 format
              listParams.start_time = syncStartTime.toISOString()
              console.log(`[Sync] Adding start_time parameter: ${listParams.start_time}`)
            } else if (syncStartTime && syncStartTime > currentTime) {
              console.warn(`[Sync] ⚠️ Warning: syncStartTime (${syncStartTime.toISOString()}) is in the future (current: ${currentTime.toISOString()}). Skipping start_time parameter.`)
            } else {
              console.log(`[Sync] No start_time parameter (syncStartTime is null)`)
            }

            response = await disputesAPI.listDisputes(listParams)
            console.log(`[Sync] First page response:`, {
              itemsCount: response.items?.length || 0,
              totalItems: response.total_items,
              totalPages: response.total_pages,
              hasLinks: !!response.links,
              syncType: syncType.toUpperCase(),
              startTime: syncStartTime?.toISOString(),
              hasLastSyncAt: !!account.lastSyncAt,
              lastSyncAt: account.lastSyncAt?.toISOString(),
            })
          }

          if (response.items && response.items.length > 0) {
            // Debug: Log first dispute to see structure
            if (pageNumber === 1 && response.items.length > 0) {
              console.log(`[Sync] Sample dispute structure:`, JSON.stringify(response.items[0], null, 2))
              // Log customer info if available
              const sample = response.items[0]
              const sampleTransaction = sample.disputed_transactions?.[0] || sample.transactions?.[0]
              console.log(`[Sync] Sample transaction:`, JSON.stringify(sampleTransaction, null, 2))
            }
            allDisputes = allDisputes.concat(response.items)
            syncedCount += response.items.length
            console.log(`[Sync] Fetched page ${pageNumber}: ${response.items.length} disputes`)
          }

          // Check for next page link
          const nextLink = response.links?.find((link) => link.rel === "next")
          if (nextLink && nextLink.href) {
            nextPageUrl = nextLink.href
            pageNumber++
          } else {
            // No more pages
            break
          }
        } catch (error) {
          console.error(
            `Error fetching disputes page ${pageNumber} for account ${accountId}:`,
            error
          )
          // Check if it's an authentication error
          if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase()
            if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
              throw error // Authentication error, stop syncing
            }
            // For other errors, log and break to avoid infinite loop
            if (errorMessage.includes("400") || errorMessage.includes("invalid")) {
              console.error(`[Sync] Invalid request error, stopping pagination`)
              break
            }
          }
          // Break on any error to avoid infinite loop
          break
        }
      }

      // 6. Filter and upsert disputes
      // For incremental sync, only process disputes that were updated since last sync
      for (const paypalDispute of allDisputes) {
        try {
          // For incremental sync, check if dispute was updated since last sync
          if (syncType === "incremental" && lastSyncTime) {
            const disputeUpdateTime = paypalDispute.update_time 
              ? new Date(paypalDispute.update_time) 
              : null
            
            // Skip if dispute wasn't updated since last sync
            if (!disputeUpdateTime || disputeUpdateTime <= lastSyncTime) {
              console.log(`[Sync] Skipping dispute ${paypalDispute.dispute_id} - not updated since last sync`)
              continue
            }
          }

          // If customer email is missing, fetch full dispute details
          let disputeToUpsert = paypalDispute
          const transaction = paypalDispute.disputed_transactions?.[0] || paypalDispute.transactions?.[0]
          if (!transaction?.buyer?.email_address) {
            console.log(`[Sync] Customer email missing for ${paypalDispute.dispute_id}, fetching full details...`)
            try {
              const fullDispute = await disputesAPI.getDispute(paypalDispute.dispute_id)
              disputeToUpsert = fullDispute
              console.log(`[Sync] Fetched full dispute details for ${paypalDispute.dispute_id}`)
            } catch (error) {
              console.warn(`[Sync] Failed to fetch full details for ${paypalDispute.dispute_id}:`, error)
              // Continue with original dispute data
            }
          }

          const disputeData = this.parsePayPalDispute(disputeToUpsert)
          const wasUpdated = await this.upsertDispute(accountId, disputeToUpsert)
          
          if (wasUpdated) {
            updatedCount++
          }
          syncedCount++
          
          console.log(`[Sync] ${wasUpdated ? 'Updated' : 'Created'} dispute ${paypalDispute.dispute_id}:`, {
            amount: disputeData.disputeAmount?.toString(),
            currency: disputeData.disputeCurrency,
            customerEmail: disputeData.customerEmail,
          })
        } catch (error) {
          console.error(
            `Error upserting dispute ${paypalDispute.dispute_id}:`,
            error
          )
          // Continue with next dispute
        }
      }

      // 7. Update sync_log when completed (SUCCESS)
      const completedAt = new Date()
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: "SUCCESS",
          disputesSynced: syncedCount,
          completedAt,
        },
      })

      // 8. Update account.last_sync_at
      await prisma.payPalAccount.update({
        where: { id: accountId },
        data: {
          lastSyncAt: completedAt,
        },
      })

      console.log(`[Sync] Sync completed: ${syncedCount} disputes processed, ${updatedCount} updated`)

      return {
        success: true,
        synced: syncedCount,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      // Update sync_log with FAILED status
      if (syncLogId) {
        try {
          await prisma.syncLog.update({
            where: { id: syncLogId },
            data: {
              status: "FAILED",
              disputesSynced: syncedCount,
              errors: errorMessage,
              completedAt: new Date(),
            },
          })
        } catch (updateError) {
          console.error("Failed to update sync log:", updateError)
        }
      }

      return {
        success: false,
        synced: syncedCount,
        errors: errorMessage,
      }
    }
  }

  /**
   * Upsert a dispute (create or update)
   * @returns true if dispute was updated, false if it was created
   */
  async upsertDispute(
    accountId: string,
    paypalDispute: PayPalDispute
  ): Promise<boolean> {
    try {
      // Check if dispute already exists
      const existingDispute = await prisma.dispute.findUnique({
        where: { disputeId: paypalDispute.dispute_id },
      })

      const disputeData = this.parsePayPalDispute(paypalDispute)

      if (existingDispute) {
        // Check if status changed
        const statusChanged =
          existingDispute.disputeStatus !== disputeData.disputeStatus

        // Update dispute
        await prisma.dispute.update({
          where: { id: existingDispute.id },
          data: disputeData,
        })

        // Create dispute_history record if status changed
        if (statusChanged) {
          await prisma.disputeHistory.create({
            data: {
              disputeId: existingDispute.id,
              actionType: "STATUS_CHANGED",
              actionBy: "SYSTEM",
              oldValue: existingDispute.disputeStatus || "",
              newValue: disputeData.disputeStatus || "",
              description: `Dispute status changed from ${existingDispute.disputeStatus} to ${disputeData.disputeStatus}`,
            },
          })
        }

        // Sync messages if available
        if (paypalDispute.messages && paypalDispute.messages.length > 0) {
          await this.syncDisputeMessages(paypalDispute.dispute_id, paypalDispute.messages)
        }

        return true // Was updated
      } else {
        // Create new dispute
        await prisma.dispute.create({
          data: {
            ...disputeData,
            paypalAccountId: accountId,
          },
        })

        // Sync messages if available
        if (paypalDispute.messages && paypalDispute.messages.length > 0) {
          await this.syncDisputeMessages(paypalDispute.dispute_id, paypalDispute.messages)
        }

        return false // Was created
      }
    } catch (error) {
      console.error(
        `Error upserting dispute ${paypalDispute.dispute_id}:`,
        error
      )
      throw error
    }
  }

  /**
   * Parse PayPal dispute response to database format
   */
  private parsePayPalDispute(paypalDispute: PayPalDispute) {
    // PayPal API uses "disputed_transactions" but we support both for compatibility
    const transaction = paypalDispute.disputed_transactions?.[0] || paypalDispute.transactions?.[0]
    
    const isResolved = paypalDispute.status === "RESOLVED" || paypalDispute.dispute_state === "RESOLVED"

    // Determine dispute outcome based on status and state
    let disputeOutcome: string | null = null
    if (isResolved) {
      // Check outcome field first (this is the actual outcome from PayPal)
      if ((paypalDispute as any).outcome) {
        disputeOutcome = (paypalDispute as any).outcome
      } 
      // Don't fallback to status or dispute_state if they are just "RESOLVED" or "CLOSED"
      // as these don't indicate win/loss, only that the dispute is resolved
      // Only use them if they contain more specific information
      else if (paypalDispute.status && 
               paypalDispute.status.toUpperCase() !== "RESOLVED" && 
               paypalDispute.status.toUpperCase() !== "CLOSED") {
        disputeOutcome = paypalDispute.status
      } else if (paypalDispute.dispute_state && 
                 paypalDispute.dispute_state.toUpperCase() !== "RESOLVED" && 
                 paypalDispute.dispute_state.toUpperCase() !== "CLOSED") {
        disputeOutcome = paypalDispute.dispute_state
      }
      // If no specific outcome found, leave it as null
      // We can't determine win/loss without actual outcome data
    }

    // Parse amount - try multiple possible locations
    let disputeAmount: Decimal | null = null
    let disputeCurrency: string | null = null

    // 1. Try dispute_amount at root level (PayPal API standard)
    if (paypalDispute.dispute_amount?.value) {
      disputeAmount = new Decimal(paypalDispute.dispute_amount.value)
      disputeCurrency = paypalDispute.dispute_amount.currency_code || null
      console.log(`[Sync] Found amount in dispute_amount for ${paypalDispute.dispute_id}:`, {
        value: paypalDispute.dispute_amount.value,
        currency: disputeCurrency,
      })
    }
    // 2. Try transaction gross_amount (fallback for old format)
    else if (transaction?.gross_amount?.value) {
      disputeAmount = new Decimal(transaction.gross_amount.value)
      disputeCurrency = transaction.gross_amount.currency_code || null
      console.log(`[Sync] Found amount in transaction.gross_amount for ${paypalDispute.dispute_id}:`, {
        value: transaction.gross_amount.value,
        currency: disputeCurrency,
      })
    }
    // 3. Try offer buyer_requested_amount
    else if ((paypalDispute as any).offer?.buyer_requested_amount?.value) {
      const offerAmount = (paypalDispute as any).offer.buyer_requested_amount
      disputeAmount = new Decimal(offerAmount.value)
      disputeCurrency = offerAmount.currency_code || null
      console.log(`[Sync] Found amount in offer.buyer_requested_amount for ${paypalDispute.dispute_id}`)
    }
    // 4. Try offer seller_offered_amount
    else if ((paypalDispute as any).offer?.seller_offered_amount?.value) {
      const offerAmount = (paypalDispute as any).offer.seller_offered_amount
      disputeAmount = new Decimal(offerAmount.value)
      disputeCurrency = offerAmount.currency_code || null
      console.log(`[Sync] Found amount in offer.seller_offered_amount for ${paypalDispute.dispute_id}`)
    }
    // 5. Try refund_details allowed_refund_amount
    else if ((paypalDispute as any).refund_details?.allowed_refund_amount?.value) {
      const refundAmount = (paypalDispute as any).refund_details.allowed_refund_amount
      disputeAmount = new Decimal(refundAmount.value)
      disputeCurrency = refundAmount.currency_code || null
      console.log(`[Sync] Found amount in refund_details.allowed_refund_amount for ${paypalDispute.dispute_id}`)
    }
    else {
      console.log(`[Sync] No amount found for dispute ${paypalDispute.dispute_id}`)
    }

    // Get transaction ID from disputed_transactions or transactions
    const transactionId = transaction?.seller_transaction_id ||
                         (transaction && 'buyer_transaction_id' in transaction ? transaction.buyer_transaction_id : undefined) ||
                         null

    // Get invoice number from transaction
    const invoiceNumber = (transaction as any)?.invoice_number || null

    // Get customer info - PayPal Disputes API may not return email for privacy reasons
    let customerEmail: string | null = null
    let customerName: string | null = null

    if (transaction?.buyer) {
      // Try email_address first
      if (transaction.buyer.email_address) {
        customerEmail = transaction.buyer.email_address
      }
      
      // Get name - can be a string or object with given_name/surname
      if (typeof transaction.buyer.name === "string") {
        customerName = transaction.buyer.name
      } else if (transaction.buyer.name) {
        const nameObj = transaction.buyer.name as any
        if (nameObj.given_name || nameObj.surname) {
          customerName = `${nameObj.given_name || ""} ${nameObj.surname || ""}`.trim() || null
        } else if (nameObj.full_name) {
          customerName = nameObj.full_name
        }
      }
    }

    // Log warning if no customer email (PayPal API limitation)
    if (!customerEmail && customerName) {
      console.log(`[Sync] Warning: Customer email not available for dispute ${paypalDispute.dispute_id} (PayPal API limitation). Customer name: ${customerName}`)
    }

    // Dispute Type: Use dispute_life_cycle_stage
    // Common values: INQUIRY, CHARGEBACK, PRE_ARBITRATION, etc.
    const disputeType = paypalDispute.dispute_life_cycle_stage || null
    const reason = paypalDispute.reason

    return {
      disputeId: paypalDispute.dispute_id,
      transactionId,
      invoiceNumber,
      disputeAmount,
      disputeCurrency,
      customerEmail,
      customerName,
      disputeType,
      // Dispute Reason: Use reason field (MERCHANDISE_OR_SERVICE_NOT_RECEIVED, etc.)
      disputeReason: reason || null,
      disputeStatus: paypalDispute.status || paypalDispute.dispute_state || null,
      disputeOutcome,
      description: null, // Can be extracted from messages if needed
      disputeChannel: paypalDispute.dispute_channel || null,
      disputeCreateTime: paypalDispute.create_time
        ? new Date(paypalDispute.create_time)
        : null,
      disputeUpdateTime: paypalDispute.update_time
        ? new Date(paypalDispute.update_time)
        : null,
      responseDueDate: paypalDispute.seller_response_due_date
        ? new Date(paypalDispute.seller_response_due_date)
        : null,
      resolvedAt: isResolved && paypalDispute.update_time
        ? new Date(paypalDispute.update_time)
        : null,
      rawData: paypalDispute as any, // Store full PayPal response
    }
  }

  /**
   * Sync dispute messages
   */
  private async syncDisputeMessages(
    disputeId: string,
    messages: PayPalDispute["messages"]
  ): Promise<void> {
    if (!messages || messages.length === 0) return

    // Find dispute by PayPal dispute_id
    const dispute = await prisma.dispute.findUnique({
      where: { disputeId },
    })

    if (!dispute) return

    for (const message of messages) {
      try {
        // Check if message already exists (by time_posted and content)
        const existingMessage = await prisma.disputeMessage.findFirst({
          where: {
            disputeId: dispute.id,
            createdAt: new Date(message.time_posted),
            content: message.content,
          },
        })

        if (!existingMessage) {
          await prisma.disputeMessage.create({
            data: {
              disputeId: dispute.id,
              messageType: message.posted_by || "UNKNOWN",
              postedBy: message.posted_by || null,
              content: message.content || null,
              attachments: message.attachments
                ? (message.attachments as any)
                : null,
              createdAt: new Date(message.time_posted),
            },
          })
        }
      } catch (error) {
        console.error("Error syncing message:", error)
        // Continue with next message
      }
    }
  }

  /**
   * Sync all active accounts
   * @param syncType - "incremental" | "90days" | "full"
   */
  async syncAllAccounts(syncType: "incremental" | "90days" | "full" = "incremental"): Promise<AccountSyncResult[]> {
    try {
      // Get all active accounts
      const accounts = await prisma.payPalAccount.findMany({
        where: {
          active: true,
        },
        select: {
          id: true,
          accountName: true,
        },
      })

      if (accounts.length === 0) {
        return []
      }

      // Sync all accounts in parallel using Promise.allSettled
      const syncPromises = accounts.map(async (account) => {
        const result = await this.syncAccount(account.id, syncType)
        return {
          accountId: account.id,
          accountName: account.accountName,
          ...result,
        }
      })

      const results = await Promise.allSettled(syncPromises)

      // Map results to AccountSyncResult format
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value
        } else {
          return {
            accountId: accounts[index].id,
            accountName: accounts[index].accountName,
            success: false,
            synced: 0,
            errors: result.reason?.message || "Unknown error",
          }
        }
      })
    } catch (error) {
      console.error("Error in syncAllAccounts:", error)
      throw error
    }
  }
}

// Export singleton instance
export const disputeSyncService = new DisputeSyncService()

