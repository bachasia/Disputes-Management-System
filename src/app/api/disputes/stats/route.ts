import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

// Force dynamic rendering (uses headers() from NextAuth)
export const dynamic = 'force-dynamic'

/**
 * GET /api/disputes/stats
 * Get dispute statistics with filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams

    // Build where clause (same as disputes route)
    const where: any = {}

    // Filter by account_id
    const accountId = searchParams.get("account_id")
    if (accountId) {
      where.paypalAccountId = accountId
    }

    // Filter by status
    const status = searchParams.get("status")
    if (status) {
      where.disputeStatus = status
    }

    // Filter by dispute_type
    const disputeType = searchParams.get("dispute_type")
    if (disputeType) {
      where.disputeType = disputeType
    }

    // Filter by date range
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    if (startDate || endDate) {
      where.disputeCreateTime = {}
      if (startDate) {
        where.disputeCreateTime.gte = new Date(startDate)
      }
      if (endDate) {
        // Add 1 day to include the end date
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.disputeCreateTime.lt = end
      }
    }

    // Search filter
    const search = searchParams.get("search")
    if (search) {
      where.OR = [
        { disputeId: { contains: search, mode: "insensitive" } },
        { transactionId: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get all disputes matching filters (for accurate stats)
    const disputes = await prisma.dispute.findMany({
      where,
      select: {
        disputeStatus: true,
        disputeOutcome: true,
        disputeAmount: true,
        disputeCurrency: true,
        resolvedAt: true, // Add resolvedAt to check resolved status
        rawData: true, // Add rawData to extract outcome if needed
      },
    })

    // Calculate stats
    const total = disputes.length

    const open = disputes.filter(
      (d) =>
        d.disputeStatus &&
        (d.disputeStatus.toUpperCase() === "OPEN" ||
          d.disputeStatus.toUpperCase().includes("WAITING") ||
          d.disputeStatus.toUpperCase().includes("REVIEW"))
    ).length

    // Consider disputes resolved if:
    // 1. Status is RESOLVED or CLOSED, OR
    // 2. Status is CANCELLED or WITHDRAWN (these are also considered resolved), OR
    // 3. resolvedAt field is set (even if status is not explicitly RESOLVED)
    const resolved = disputes.filter((d) => {
      const status = d.disputeStatus?.toUpperCase() || ""
      const isStatusResolved = 
        status === "RESOLVED" || 
        status === "CLOSED" ||
        status.includes("CANCEL") ||
        status.includes("WITHDRAWN") ||
        status === "CANCELLED" ||
        status === "CANCELED"
      const hasResolvedAt = !!d.resolvedAt
      return isStatusResolved || hasResolvedAt
    })

    const resolvedCount = resolved.length

    // Helper function to extract actual outcome from dispute
    // This matches the logic in analytics/overview/route.ts
    const getActualOutcome = (dispute: any): string | null => {
      // If outcome exists and is not just "RESOLVED" or "CLOSED", use it
      if (
        dispute.disputeOutcome &&
        dispute.disputeOutcome.trim() !== "" &&
        dispute.disputeOutcome.toUpperCase() !== "RESOLVED" &&
        dispute.disputeOutcome.toUpperCase() !== "CLOSED"
      ) {
        return dispute.disputeOutcome
      }

      // Try to extract from rawData if available
      if (dispute.rawData && typeof dispute.rawData === "object") {
        const raw = dispute.rawData as any

        // Check for outcome field in rawData (most common)
        if (
          raw.outcome &&
          typeof raw.outcome === "string" &&
          raw.outcome.trim() !== "" &&
          raw.outcome.toUpperCase() !== "RESOLVED" &&
          raw.outcome.toUpperCase() !== "CLOSED"
        ) {
          return raw.outcome
        }

        // Check for dispute_outcome field (alternative format)
        if (
          raw.dispute_outcome &&
          typeof raw.dispute_outcome === "string" &&
          raw.dispute_outcome.trim() !== "" &&
          raw.dispute_outcome.toUpperCase() !== "RESOLVED" &&
          raw.dispute_outcome.toUpperCase() !== "CLOSED"
        ) {
          return raw.dispute_outcome
        }

        // Check for other possible outcome indicators
        // Some PayPal API responses might have outcome in different locations
        if (
          raw.adjudications &&
          Array.isArray(raw.adjudications) &&
          raw.adjudications.length > 0
        ) {
          const lastAdjudication =
            raw.adjudications[raw.adjudications.length - 1]
          if (
            lastAdjudication.type &&
            lastAdjudication.type.toUpperCase() !== "RESOLVED"
          ) {
            return lastAdjudication.type
          }
        }
      }

      return null
    }

    // Helper function to determine outcome type (won/lost/cancelled)
    const getOutcomeType = (
      outcome: string | null
    ): "won" | "lost" | "cancelled" | null => {
      if (!outcome || outcome.trim() === "") {
        return null
      }

      const outcomeUpper = outcome.toUpperCase().trim()

      // Check for cancelled/withdrawn first
      if (
        outcomeUpper.includes("CANCEL") ||
        outcomeUpper.includes("WITHDRAWN") ||
        outcomeUpper === "CANCELLED" ||
        outcomeUpper === "CANCELED"
      ) {
        return "cancelled"
      }

      // Check for buyer win indicators (if buyer won, seller lost)
      const isBuyerWin =
        outcomeUpper.includes("PAYOUT_TO_BUYER") ||
        outcomeUpper.includes("BUYER_WIN") ||
        outcomeUpper.includes("RESOLVED_BUYER_FAVOR") ||
        outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOR") ||
        outcomeUpper.includes("RESOLVED_BUYER_FAVOUR") ||
        outcomeUpper.includes("RESOLVED_IN_BUYER_FAVOUR") ||
        outcomeUpper.includes("BUYER_FAVOR") ||
        outcomeUpper.includes("BUYER_FAVOUR") ||
        outcomeUpper.includes("FAVOR_BUYER") ||
        outcomeUpper.includes("FAVOUR_BUYER") ||
        outcomeUpper === "REFUNDED" ||
        outcomeUpper === "REFUND" ||
        (outcomeUpper.includes("BUYER") &&
          (outcomeUpper.includes("WON") ||
            outcomeUpper.includes("FAVOR") ||
            outcomeUpper.includes("FAVOUR"))) ||
        outcomeUpper === "LOST" ||
        outcomeUpper === "BUYER"

      if (isBuyerWin) {
        return "lost"
      }

      // Check for seller win indicators
      const isSellerWin =
        outcomeUpper.includes("SELLER") ||
        outcomeUpper === "WON" ||
        outcomeUpper === "RESOLVED_SELLER_FAVOR" ||
        outcomeUpper === "RESOLVED_SELLER_FAVOUR" ||
        outcomeUpper === "SELLER_WIN" ||
        outcomeUpper === "RESOLVED_IN_SELLER_FAVOR" ||
        outcomeUpper === "RESOLVED_IN_SELLER_FAVOUR" ||
        outcomeUpper.includes("SELLER_FAVOR") ||
        outcomeUpper.includes("SELLER_FAVOUR") ||
        outcomeUpper.includes("FAVOR_SELLER") ||
        outcomeUpper.includes("FAVOUR_SELLER") ||
        outcomeUpper === "SELLER_FAVORABLE" ||
        outcomeUpper === "FAVORABLE_TO_SELLER" ||
        outcomeUpper === "SELLER_WON" ||
        // Check for negative buyer indicators (if buyer lost, seller won)
        (outcomeUpper.includes("BUYER") &&
          (outcomeUpper.includes("LOST") ||
            outcomeUpper.includes("DENIED") ||
            outcomeUpper.includes("REJECTED")))

      if (isSellerWin) {
        return "won"
      }

      return null
    }

    // Calculate won, lost, and cancelled disputes
    let won = 0
    let lost = 0
    let cancelled = 0

    resolved.forEach((d) => {
      const status = d.disputeStatus?.toUpperCase() || ""
      
      // Check if status itself indicates cancelled (CANCELLED, WITHDRAWN, etc.)
      const isStatusCancelled =
        status.includes("CANCEL") ||
        status.includes("WITHDRAWN") ||
        status === "CANCELLED" ||
        status === "CANCELED"
      
      if (isStatusCancelled) {
        cancelled++
        return
      }
      
      // Otherwise, check outcome
      const actualOutcome = getActualOutcome(d)
      const outcomeType = getOutcomeType(actualOutcome)

      switch (outcomeType) {
        case "won":
          won++
          break
        case "lost":
          lost++
          break
        case "cancelled":
          cancelled++
          break
        default:
          // Unknown outcome - don't count in any category
          break
      }
    })

    const winRate = resolvedCount > 0 ? (won / resolvedCount) * 100 : 0

    // Calculate total amount by currency
    const totalAmountByCurrency: Record<string, number> = {}

    disputes.forEach((dispute) => {
      if (dispute.disputeAmount && dispute.disputeCurrency) {
        const amount = parseFloat(dispute.disputeAmount.toString())
        const currency = dispute.disputeCurrency

        if (!totalAmountByCurrency[currency]) {
          totalAmountByCurrency[currency] = 0
        }
        totalAmountByCurrency[currency] += amount
      }
    })

    // Calculate total in USD (or first currency if no USD)
    let totalAmount = 0
    if (totalAmountByCurrency["USD"]) {
      totalAmount = totalAmountByCurrency["USD"]
    } else if (Object.keys(totalAmountByCurrency).length > 0) {
      // Use first currency if no USD
      totalAmount = Object.values(totalAmountByCurrency)[0]
    }

    return NextResponse.json(
      {
        total,
        open,
        resolved: resolvedCount,
        won,
        lost,
        cancelled,
        winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
        totalAmount,
        totalAmountByCurrency,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

