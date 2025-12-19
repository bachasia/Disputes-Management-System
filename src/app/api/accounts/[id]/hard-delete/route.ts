import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { checkAdmin } from "@/lib/auth/role-check"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * DELETE /api/accounts/[id]/hard-delete
 * Hard delete - permanently delete PayPal account and all related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Only admin can hard delete PayPal accounts
    const permissionError = await checkAdmin(request)
    if (permissionError) return permissionError

    const { id } = params

    // Check if account exists
    const existing = await prisma.payPalAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            disputes: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Account not found",
        },
        { status: 404 }
      )
    }

    // Hard delete - permanently delete account and all related data
    // Prisma will cascade delete disputes, sync logs, etc. due to onDelete: Cascade
    await prisma.payPalAccount.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        message: "Account deleted permanently",
        deletedDisputes: existing._count.disputes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error hard deleting account:", error)
    return NextResponse.json(
      {
        error: "Failed to delete account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
