import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { checkWritePermission } from "@/lib/auth/role-check"

interface DisputesQueryParams {
  account_id?: string
  status?: string
  dispute_type?: string
  start_date?: string
  end_date?: string
  search?: string
  page?: string
  limit?: string
}

interface DisputesResponse {
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * GET /api/disputes
 * List disputes with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params: DisputesQueryParams = {
      account_id: searchParams.get("account_id") || undefined,
      status: searchParams.get("status") || undefined,
      dispute_type: searchParams.get("dispute_type") || undefined,
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    }

    // Build dynamic WHERE clause
    const where: Prisma.DisputeWhereInput = {}

    // Filter by account_id
    if (params.account_id) {
      where.paypalAccountId = params.account_id
    }

    // Filter by dispute_type
    if (params.dispute_type) {
      where.disputeType = params.dispute_type
    }

    // Filter by date range
    if (params.start_date || params.end_date) {
      where.disputeCreateTime = {}
      if (params.start_date) {
        where.disputeCreateTime.gte = new Date(params.start_date)
      }
      if (params.end_date) {
        // Add 1 day to include the end date
        const endDate = new Date(params.end_date)
        endDate.setDate(endDate.getDate() + 1)
        where.disputeCreateTime.lt = endDate
      }
    }

    // Search filter (search in dispute_id, transaction_id, customer_email, customer_name, invoice_number)
    const searchConditions: Prisma.DisputeWhereInput[] = []
    if (params.search) {
      searchConditions.push({
        OR: [
          { disputeId: { contains: params.search, mode: "insensitive" } },
          { transactionId: { contains: params.search, mode: "insensitive" } },
          { customerEmail: { contains: params.search, mode: "insensitive" } },
          { customerName: { contains: params.search, mode: "insensitive" } },
          { invoiceNumber: { contains: params.search, mode: "insensitive" } },
        ],
      })
    }

    // Filter by status (handle OPEN specially to include WAITING and REVIEW)
    const statusConditions: Prisma.DisputeWhereInput[] = []
    if (params.status) {
      if (params.status.toUpperCase() === "OPEN") {
        // Open includes: OPEN, WAITING_*, *_REVIEW
        statusConditions.push({
          OR: [
            { disputeStatus: { equals: "OPEN", mode: "insensitive" } },
            { disputeStatus: { contains: "WAITING", mode: "insensitive" } },
            { disputeStatus: { contains: "REVIEW", mode: "insensitive" } },
          ],
        })
      } else {
        statusConditions.push({
          disputeStatus: params.status,
        })
      }
    }

    // Combine all conditions with AND logic
    const combinedConditions: Prisma.DisputeWhereInput[] = []
    if (Object.keys(where).length > 0) {
      combinedConditions.push(where)
    }
    if (searchConditions.length > 0) {
      combinedConditions.push(...searchConditions)
    }
    if (statusConditions.length > 0) {
      combinedConditions.push(...statusConditions)
    }

    // Build final where clause
    const finalWhere: Prisma.DisputeWhereInput =
      combinedConditions.length > 1
        ? { AND: combinedConditions }
        : combinedConditions[0] || {}

    // Pagination
    const page = parseInt(params.page || "1", 10)
    const limit = Math.min(parseInt(params.limit || "20", 10), 100) // Max 100 per page
    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.dispute.count({ where: finalWhere })

    // Get disputes with pagination
    const disputes = await prisma.dispute.findMany({
      where: finalWhere,
      include: {
        paypalAccount: {
          select: {
            id: true,
            accountName: true,
            email: true,
            sandboxMode: true,
          },
        },
      },
      orderBy: {
        disputeCreateTime: "desc",
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    const response: DisputesResponse = {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Error fetching disputes:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch disputes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/disputes
 * Create dispute manually (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const body = await request.json()

    // Validate required fields
    if (!body.paypal_account_id || !body.dispute_id) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "paypal_account_id and dispute_id are required",
        },
        { status: 400 }
      )
    }

    // Check if dispute already exists
    const existing = await prisma.dispute.findUnique({
      where: { disputeId: body.dispute_id },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Dispute with this dispute_id already exists",
        },
        { status: 409 }
      )
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        paypalAccountId: body.paypal_account_id,
        disputeId: body.dispute_id,
        transactionId: body.transaction_id || null,
        disputeAmount: body.dispute_amount
          ? new Decimal(body.dispute_amount)
          : null,
        disputeCurrency: body.dispute_currency || null,
        customerEmail: body.customer_email || null,
        customerName: body.customer_name || null,
        disputeType: body.dispute_type || null,
        disputeReason: body.dispute_reason || null,
        disputeStatus: body.dispute_status || null,
        disputeOutcome: body.dispute_outcome || null,
        description: body.description || null,
        disputeChannel: body.dispute_channel || null,
        disputeCreateTime: body.dispute_create_time
          ? new Date(body.dispute_create_time)
          : null,
        disputeUpdateTime: body.dispute_update_time
          ? new Date(body.dispute_update_time)
          : null,
        responseDueDate: body.response_due_date
          ? new Date(body.response_due_date)
          : null,
        resolvedAt: body.resolved_at ? new Date(body.resolved_at) : null,
        rawData: body.raw_data || null,
      },
      include: {
        paypalAccount: {
          select: {
            id: true,
            accountName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(dispute, { status: 201 })
  } catch (error) {
    console.error("Error creating dispute:", error)
    return NextResponse.json(
      {
        error: "Failed to create dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
