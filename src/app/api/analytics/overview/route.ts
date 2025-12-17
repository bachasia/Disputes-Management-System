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
    // 2. resolvedAt field is set (even if status is not explicitly RESOLVED)
    const resolved = disputes.filter((d) => {
      const status = d.disputeStatus?.toUpperCase() || ""
      const isStatusResolved = status === "RESOLVED" || status === "CLOSED"
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

    // Helper function to determine outcome type (won, lost, cancelled)
    const determineOutcomeType = (dispute: any): "won" | "lost" | "cancelled" | null => {
      const actualOutcome = getActualOutcome(dispute)
      
      if (!actualOutcome || actualOutcome.trim() === "") {
        // If resolved but no outcome, consider it cancelled
        const status = dispute.disputeStatus?.toUpperCase() || ""
        const isResolved = status === "RESOLVED" || status === "CLOSED" || !!dispute.resolvedAt
        return isResolved ? "cancelled" : null
      }
      
      const outcome = actualOutcome.toUpperCase().trim()
      
      // Check for buyer win indicators first (if buyer won, seller lost)
      const isBuyerWin = (
        outcome.includes("PAYOUT_TO_BUYER") ||
        outcome.includes("BUYER_WIN") ||
        outcome.includes("RESOLVED_BUYER_FAVOR") ||
        outcome.includes("RESOLVED_IN_BUYER_FAVOR") ||
        outcome.includes("BUYER_FAVOR") ||
        outcome.includes("FAVOR_BUYER") ||
        outcome === "REFUNDED" ||
        outcome === "REFUND" ||
        (outcome.includes("BUYER") && 
         (outcome.includes("WON") || 
          outcome.includes("FAVOR") ||
          outcome.includes("FAVOUR")))
      )
      
      if (isBuyerWin) {
        return "lost"
      }
      
      // Check for seller win indicators
      const isWon = (
        outcome.includes("SELLER") ||
        outcome === "WON" ||
        outcome === "RESOLVED_SELLER_FAVOR" ||
        outcome === "SELLER_WIN" ||
        outcome === "RESOLVED_IN_SELLER_FAVOR" ||
        outcome.includes("SELLER_FAVOR") ||
        outcome.includes("FAVOR_SELLER") ||
        outcome === "SELLER_FAVORABLE" ||
        outcome === "FAVORABLE_TO_SELLER" ||
        outcome === "SELLER_FAVOUR" ||
        outcome.includes("SELLER_FAVOUR") ||
        outcome === "RESOLVED_SELLER_FAVOUR" ||
        // Check for negative buyer indicators (if buyer lost, seller won)
        (outcome.includes("BUYER") && 
         (outcome.includes("LOST") || 
          outcome.includes("DENIED") || 
          outcome.includes("REJECTED")))
      )
      
      if (isWon) {
        return "won"
      }
      
      // If resolved but outcome doesn't match known patterns, consider cancelled
      const status = dispute.disputeStatus?.toUpperCase() || ""
      const isResolved = status === "RESOLVED" || status === "CLOSED" || !!dispute.resolvedAt
      return isResolved ? "cancelled" : null
    }

    // Calculate won disputes - includes both Won and Cancelled
    const won = resolved.filter((d) => {
      const outcomeType = determineOutcomeType(d)
      const isWon = outcomeType === "won" || outcomeType === "cancelled"
      
      if (isWon) {
        const actualOutcome = getActualOutcome(d)
        console.log(`[Analytics] ✓ Dispute with outcome "${actualOutcome || 'none'}" (from ${d.disputeOutcome ? 'stored' : 'rawData'}) is counted as WON (type: ${outcomeType})`)
      } else if (outcomeType === "lost") {
        const actualOutcome = getActualOutcome(d)
        console.log(`[Analytics] ✗ Dispute with outcome "${actualOutcome || 'none'}" is BUYER WIN (seller lost)`)
      }
      
      return isWon
    }).length

    console.log(
      `[Analytics] Win Rate calculation: won=${won} (includes Won + Cancelled), resolved=${resolvedCount}, winRate=${resolvedCount > 0 ? (won / resolvedCount) * 100 : 0}%`
    )

    // Win Rate = (Won + Cancelled) / Resolved * 100
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

