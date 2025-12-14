import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"

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

