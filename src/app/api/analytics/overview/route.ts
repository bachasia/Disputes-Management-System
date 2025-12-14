import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

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

    const resolved = disputes.filter(
      (d) =>
        d.disputeStatus &&
        (d.disputeStatus.toUpperCase() === "RESOLVED" ||
          d.disputeStatus.toUpperCase() === "CLOSED")
    )

    const resolvedCount = resolved.length

    // Calculate won disputes - only count resolved disputes with seller-favorable outcome
    const won = resolved.filter((d) => {
      if (!d.disputeOutcome) return false
      const outcome = d.disputeOutcome.toUpperCase()
      // Check for seller win indicators
      return (
        outcome.includes("SELLER") ||
        outcome === "WON" ||
        outcome === "RESOLVED_SELLER_FAVOR" ||
        outcome === "SELLER_WIN" ||
        outcome === "RESOLVED_IN_SELLER_FAVOR"
      )
    }).length

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

