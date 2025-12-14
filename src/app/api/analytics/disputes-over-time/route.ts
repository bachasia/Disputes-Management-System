import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { format, startOfDay, subDays, differenceInDays, addDays } from "date-fns"

/**
 * GET /api/analytics/disputes-over-time
 * Get disputes count over time (daily)
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

    // Get date range - prefer start_date/end_date over days
    let startDate: Date
    let endDate: Date
    let days: number

    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    if (startDateParam && endDateParam) {
      // Use provided date range
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      days = differenceInDays(endDate, startDate) + 1
    } else {
      // Fallback to days parameter (default to last 30 days)
      const daysParam = parseInt(searchParams.get("days") || "30", 10)
      endDate = new Date()
      startDate = subDays(endDate, daysParam)
      days = daysParam
    }

    where.disputeCreateTime = {
      gte: startDate,
      lte: endDate,
    }

    // Get all disputes in range
    const disputes = await prisma.dispute.findMany({
      where,
      select: {
        disputeCreateTime: true,
        disputeStatus: true,
        resolvedAt: true,
      },
    })

    // Group by date
    const dateMap: Record<string, { total: number; resolved: number }> = {}

    // Initialize all dates in range
    const rangeStart = startOfDay(startDate)
    for (let i = 0; i < days; i++) {
      const date = addDays(rangeStart, i)
      const dateKey = format(date, "yyyy-MM-dd")
      dateMap[dateKey] = { total: 0, resolved: 0 }
    }

    // Count disputes by date
    disputes.forEach((dispute) => {
      if (dispute.disputeCreateTime) {
        const dateKey = format(dispute.disputeCreateTime, "yyyy-MM-dd")
        if (dateMap[dateKey]) {
          dateMap[dateKey].total++
          if (
            dispute.disputeStatus &&
            (dispute.disputeStatus.toUpperCase() === "RESOLVED" ||
              dispute.disputeStatus.toUpperCase() === "CLOSED")
          ) {
            dateMap[dateKey].resolved++
          }
        }
      }
    })

    // Convert to array format
    const data = Object.entries(dateMap)
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        resolved: counts.resolved,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Error fetching disputes over time:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch disputes over time",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

