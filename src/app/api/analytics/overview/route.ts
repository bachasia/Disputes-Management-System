import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

// Force dynamic rendering (uses headers() from NextAuth)
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/overview
 * Get overview KPI metrics
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

    // Build where clause
    const where: Prisma.DisputeWhereInput = {}

    // Filter by account_id
    const accountId = searchParams.get("account_id")
    if (accountId) {
      where.paypalAccountId = accountId
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
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.disputeCreateTime.lt = end
      }
    }

    // Get all disputes matching filters
    const disputes = await prisma.dispute.findMany({
      where,
      select: {
        disputeStatus: true,
        disputeOutcome: true,
        disputeAmount: true,
        disputeCurrency: true,
        disputeCreateTime: true,
        resolvedAt: true,
        rawData: true, // Include rawData to extract actual outcome if needed
      },
    })

    // Calculate metrics
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

    // Debug: Log resolved disputes and their outcomes
    if (resolvedCount > 0) {
      console.log(`[Analytics] Found ${resolvedCount} resolved disputes:`)
      resolved.forEach((d, idx) => {
        const rawDataStr = d.rawData ? JSON.stringify(d.rawData).substring(0, 200) : "null"
        console.log(
          `[Analytics] Resolved ${idx + 1}: status="${d.disputeStatus || "null"}", outcome="${d.disputeOutcome || "null"}", resolvedAt="${d.resolvedAt || "null"}", rawData preview="${rawDataStr}..."`
        )
        
        // Log rawData outcome if exists
        if (d.rawData && typeof d.rawData === 'object') {
          const raw = d.rawData as any
          console.log(`[Analytics]   RawData fields: outcome="${raw.outcome || 'null'}", dispute_outcome="${raw.dispute_outcome || 'null'}", status="${raw.status || 'null'}", dispute_state="${raw.dispute_state || 'null'}"`)
        }
      })
    }

    // Helper function to check if dispute is cancelled from rawData
    // This is important because cancelled disputes might have status RESOLVED/CLOSED
    // but the actual cancelled status is in rawData
    const isCancelledFromRawData = (rawData: any): boolean => {
      if (!rawData || typeof rawData !== "object") {
        return false
      }

      const raw = rawData as any

      // Check status fields for cancelled indicators
      const status = raw.status || raw.dispute_status || raw.dispute_state
      if (status) {
        const statusUpper = String(status).toUpperCase().trim()
        if (
          statusUpper.includes("CANCEL") ||
          statusUpper.includes("WITHDRAWN") ||
          statusUpper === "CANCELLED" ||
          statusUpper === "CANCELED"
        ) {
          return true
        }
      }

      // Check outcome fields for cancelled indicators
      const outcome = raw.outcome || raw.dispute_outcome
      if (outcome) {
        const outcomeUpper = String(outcome).toUpperCase().trim()
        if (
          outcomeUpper.includes("CANCEL") ||
          outcomeUpper.includes("WITHDRAWN") ||
          outcomeUpper === "CANCELLED" ||
          outcomeUpper === "CANCELED"
        ) {
          return true
        }
      }

      return false
    }

    // Helper function to extract actual outcome from dispute
    const getActualOutcome = (dispute: any): string | null => {
      // If outcome exists and is not just "RESOLVED" or "CLOSED", use it
      if (dispute.disputeOutcome && 
          dispute.disputeOutcome.trim() !== "" &&
          dispute.disputeOutcome.toUpperCase() !== "RESOLVED" &&
          dispute.disputeOutcome.toUpperCase() !== "CLOSED") {
        console.log(`[Analytics] Using stored outcome: "${dispute.disputeOutcome}"`)
        return dispute.disputeOutcome
      }
      
      // Try to extract from rawData if available
      if (dispute.rawData && typeof dispute.rawData === 'object') {
        const raw = dispute.rawData as any
        
        // Check for outcome field in rawData (most common)
        if (raw.outcome && 
            typeof raw.outcome === 'string' &&
            raw.outcome.trim() !== "" &&
            raw.outcome.toUpperCase() !== "RESOLVED" &&
            raw.outcome.toUpperCase() !== "CLOSED") {
          console.log(`[Analytics] Found outcome in rawData.outcome: "${raw.outcome}"`)
          return raw.outcome
        }
        
        // Check for dispute_outcome field (alternative format)
        if (raw.dispute_outcome && 
            typeof raw.dispute_outcome === 'string' &&
            raw.dispute_outcome.trim() !== "" &&
            raw.dispute_outcome.toUpperCase() !== "RESOLVED" &&
            raw.dispute_outcome.toUpperCase() !== "CLOSED") {
          console.log(`[Analytics] Found outcome in rawData.dispute_outcome: "${raw.dispute_outcome}"`)
          return raw.dispute_outcome
        }
        
        // Check for other possible outcome indicators
        // Some PayPal API responses might have outcome in different locations
        if (raw.adjudications && Array.isArray(raw.adjudications) && raw.adjudications.length > 0) {
          const lastAdjudication = raw.adjudications[raw.adjudications.length - 1]
          if (lastAdjudication.type && lastAdjudication.type.toUpperCase() !== "RESOLVED") {
            console.log(`[Analytics] Found outcome in rawData.adjudications: "${lastAdjudication.type}"`)
            return lastAdjudication.type
          }
        }
        
        console.log(`[Analytics] No valid outcome found in rawData. Available fields: ${Object.keys(raw).join(", ")}`)
      }
      
      return null
    }

    // Calculate won disputes - count resolved disputes with:
    // 1. Status or outcome indicating "Won"
    // 2. Status or outcome indicating "Cancelled" (cancelled cases are considered wins)
    const won = resolved.filter((d) => {
      const status = d.disputeStatus?.toUpperCase().trim() || ""
      
      // Get actual outcome (from disputeOutcome or rawData)
      const actualOutcome = getActualOutcome(d)
      const outcome = actualOutcome ? actualOutcome.toUpperCase().trim() : ""
      
      // IMPORTANT: Check for Cancelled from rawData FIRST
      // This catches cases where status is RESOLVED/CLOSED but rawData shows cancelled
      if (isCancelledFromRawData(d.rawData)) {
        console.log(`[Analytics] ✓ Dispute with status "${d.disputeStatus}" is CANCELLED from rawData (counted as WIN)`)
        return true
      }
      
      // Check for Cancelled status/outcome (cancelled = win)
      const isCancelled = (
        status.includes("CANCEL") ||
        status === "CANCELLED" ||
        status === "CANCELED" ||
        status.includes("WITHDRAWN") ||
        outcome.includes("CANCEL") ||
        outcome === "CANCELLED" ||
        outcome === "CANCELED" ||
        outcome.includes("WITHDRAWN")
      )
      
      if (isCancelled) {
        console.log(`[Analytics] ✓ Dispute with status "${d.disputeStatus}" and outcome "${actualOutcome || 'null'}" is CANCELLED (counted as WIN)`)
        return true
      }
      
      // Check for Won status/outcome
      const isWonStatus = (
        status === "WON" ||
        status.includes("WON")
      )
      
      const isWonOutcome = (
        outcome === "WON" ||
        outcome.includes("SELLER") ||
        outcome === "RESOLVED_SELLER_FAVOR" ||
        outcome === "RESOLVED_SELLER_FAVOUR" ||
        outcome === "SELLER_WIN" ||
        outcome === "RESOLVED_IN_SELLER_FAVOR" ||
        outcome.includes("SELLER_FAVOR") ||
        outcome.includes("SELLER_FAVOUR") ||
        outcome.includes("FAVOR_SELLER") ||
        outcome === "SELLER_FAVORABLE" ||
        outcome === "FAVORABLE_TO_SELLER" ||
        // Check for negative buyer indicators (if buyer lost, seller won)
        (outcome.includes("BUYER") && 
         (outcome.includes("LOST") || 
          outcome.includes("DENIED") || 
          outcome.includes("REJECTED")))
      )
      
      if (isWonStatus || isWonOutcome) {
        console.log(`[Analytics] ✓ Dispute with status "${d.disputeStatus}" and outcome "${actualOutcome || 'null'}" is WON (counted as WIN)`)
        return true
      }
      
      // Check for buyer win indicators (if buyer won, seller lost) - exclude from wins
      const isBuyerWin = (
        outcome.includes("PAYOUT_TO_BUYER") ||
        outcome.includes("BUYER_WIN") ||
        outcome.includes("RESOLVED_BUYER_FAVOR") ||
        outcome.includes("RESOLVED_BUYER_FAVOUR") ||
        outcome.includes("RESOLVED_IN_BUYER_FAVOR") ||
        outcome.includes("BUYER_FAVOR") ||
        outcome.includes("BUYER_FAVOUR") ||
        outcome.includes("FAVOR_BUYER") ||
        outcome === "REFUNDED" ||
        outcome === "REFUND" ||
        (outcome.includes("BUYER") && 
         (outcome.includes("WON") || 
          outcome.includes("FAVOR") ||
          outcome.includes("FAVOUR")))
      )
      
      if (isBuyerWin) {
        console.log(`[Analytics] ✗ Dispute with outcome "${actualOutcome}" is BUYER WIN (seller lost)`)
        return false
      }
      
      // If no clear outcome, don't count as win
      if (!actualOutcome || actualOutcome.trim() === "") {
        console.log(
          `[Analytics] ✗ Dispute with status "${d.disputeStatus}" has no valid outcome (stored: "${d.disputeOutcome || 'null'}"). Cannot determine win/loss.`
        )
        return false
      }
      
      console.log(`[Analytics] ✗ Dispute with outcome "${actualOutcome}" is NOT counted as WON (may be buyer win or unknown)`)
      return false
    }).length

    console.log(
      `[Analytics] Win Rate calculation: won=${won}, resolved=${resolvedCount}, winRate=${resolvedCount > 0 ? (won / resolvedCount) * 100 : 0}%`
    )

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

    // Calculate average resolution time (in days)
    const resolvedDisputes = disputes.filter(
      (d) => d.disputeCreateTime && d.resolvedAt
    )
    let avgResolutionTime = 0
    if (resolvedDisputes.length > 0) {
      const totalDays = resolvedDisputes.reduce((sum, d) => {
        if (d.disputeCreateTime && d.resolvedAt) {
          const days =
            (d.resolvedAt.getTime() - d.disputeCreateTime.getTime()) /
            (1000 * 60 * 60 * 24)
          return sum + days
        }
        return sum
      }, 0)
      avgResolutionTime = totalDays / resolvedDisputes.length
    }

    // Calculate this month vs last month
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthDisputes = disputes.filter(
      (d) => d.disputeCreateTime && d.disputeCreateTime >= thisMonthStart
    ).length

    const lastMonthDisputes = disputes.filter(
      (d) =>
        d.disputeCreateTime &&
        d.disputeCreateTime >= lastMonthStart &&
        d.disputeCreateTime < thisMonthStart
    ).length

    const monthOverMonthChange =
      lastMonthDisputes > 0
        ? ((thisMonthDisputes - lastMonthDisputes) / lastMonthDisputes) * 100
        : 0

    return NextResponse.json(
      {
        total,
        open,
        resolved: resolvedCount,
        winRate: Math.round(winRate * 10) / 10,
        won, // Include won count for debugging
        totalAmountByCurrency,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        thisMonthDisputes,
        lastMonthDisputes,
        monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching overview:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch overview",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

