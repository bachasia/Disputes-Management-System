import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { checkWritePermission } from "@/lib/auth/role-check"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/disputes/[id]
 * Get single dispute by ID with relations
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        paypalAccount: {
          select: {
            id: true,
            accountName: true,
            email: true,
            sandboxMode: true,
            active: true,
          },
        },
        history: {
          orderBy: {
            createdAt: "desc",
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Dispute not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(dispute, { status: 200 })
  } catch (error) {
    console.error("Error fetching dispute:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/disputes/[id]
 * Update dispute
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const { id } = params
    const body = await request.json()

    // Check if dispute exists
    const existing = await prisma.dispute.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Dispute not found",
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.dispute_status !== undefined) {
      // Check if status changed
      if (existing.disputeStatus !== body.dispute_status) {
        // Create history record
        await prisma.disputeHistory.create({
          data: {
            disputeId: id,
            actionType: "STATUS_CHANGED",
            actionBy: body.action_by || "USER",
            oldValue: existing.disputeStatus || "",
            newValue: body.dispute_status || "",
            description: body.description || `Status changed from ${existing.disputeStatus} to ${body.dispute_status}`,
            metadata: body.metadata || null,
          },
        })
      }
      updateData.disputeStatus = body.dispute_status
    }

    if (body.dispute_outcome !== undefined) {
      updateData.disputeOutcome = body.dispute_outcome
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.resolved_at !== undefined) {
      updateData.resolvedAt = body.resolved_at
        ? new Date(body.resolved_at)
        : null
    }

    if (body.response_due_date !== undefined) {
      updateData.responseDueDate = body.response_due_date
        ? new Date(body.response_due_date)
        : null
    }

    // Update dispute
    const updated = await prisma.dispute.update({
      where: { id },
      data: updateData,
      include: {
        paypalAccount: {
          select: {
            id: true,
            accountName: true,
            email: true,
          },
        },
        history: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Latest 10 history records
        },
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error("Error updating dispute:", error)
    return NextResponse.json(
      {
        error: "Failed to update dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/disputes/[id]
 * Delete dispute
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const { id } = params

    // Check if dispute exists
    const existing = await prisma.dispute.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Dispute not found",
        },
        { status: 404 }
      )
    }

    // Delete dispute (cascade will delete related history and messages)
    await prisma.dispute.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        message: "Dispute deleted successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting dispute:", error)
    return NextResponse.json(
      {
        error: "Failed to delete dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


