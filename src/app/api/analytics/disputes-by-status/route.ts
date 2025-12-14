import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/analytics/disputes-by-status
 * Get disputes count grouped by status
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
      },
    })

    // Group by status
    const statusMap: Record<string, number> = {}
    disputes.forEach((dispute) => {
      const status = dispute.disputeStatus || "UNKNOWN"
      statusMap[status] = (statusMap[status] || 0) + 1
    })

    // Convert to array format with readable labels
    const statusLabels: Record<string, string> = {
      OPEN: "Open",
      WAITING_FOR_SELLER_RESPONSE: "Waiting for Seller Response",
      WAITING_FOR_BUYER_RESPONSE: "Waiting for Buyer Response",
      UNDER_REVIEW: "Under Review",
      RESOLVED: "Resolved",
      CLOSED: "Closed",
      UNKNOWN: "Unknown",
    }

    const data = Object.entries(statusMap).map(([status, count]) => ({
      status,
      label: statusLabels[status] || status,
      count,
    }))

    // Sort by count descending
    data.sort((a, b) => b.count - a.count)

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Error fetching disputes by status:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch disputes by status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

