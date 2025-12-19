import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { checkAdmin } from "@/lib/auth/role-check"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/accounts/[id]/toggle-active
 * Toggle active status of PayPal account
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Only admin can toggle account status
    const permissionError = await checkAdmin(request)
    if (permissionError) return permissionError

    const { id } = params

    // Check if account exists
    const existing = await prisma.payPalAccount.findUnique({
      where: { id },
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

    // Toggle active status
    const updated = await prisma.payPalAccount.update({
      where: { id },
      data: {
        active: !existing.active,
      },
      select: {
        id: true,
        accountName: true,
        email: true,
        active: true,
        sandboxMode: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            disputes: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        id: updated.id,
        account_name: updated.accountName,
        email: updated.email,
        active: updated.active,
        sandbox_mode: updated.sandboxMode,
        last_sync_at: updated.lastSyncAt,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
        disputes_count: updated._count.disputes,
        message: updated.active
          ? "Account activated successfully"
          : "Account deactivated successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error toggling account status:", error)
    return NextResponse.json(
      {
        error: "Failed to toggle account status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
