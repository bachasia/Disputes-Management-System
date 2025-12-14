import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/encryption"
import { checkAdmin } from "@/lib/auth/role-check"

interface RouteParams {
  params: {
    id: string
  }
}

interface UpdateAccountRequest {
  account_name?: string
  email?: string
  client_id?: string
  secret_key?: string
  sandbox_mode?: boolean
  active?: boolean
}

/**
 * GET /api/accounts/[id]
 * Get single PayPal account
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params

    const account = await prisma.payPalAccount.findUnique({
      where: { id },
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

    if (!account) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Account not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: account.id,
        account_name: account.accountName,
        email: account.email,
        active: account.active,
        sandbox_mode: account.sandboxMode,
        last_sync_at: account.lastSyncAt,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
        disputes_count: account._count.disputes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/accounts/[id]
 * Update PayPal account
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Only admin can update PayPal accounts
    const permissionError = await checkAdmin(request)
    if (permissionError) return permissionError

    const { id } = params
    const body: UpdateAccountRequest = await request.json()

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

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "Invalid email format",
          },
          { status: 400 }
        )
      }

      // Check if email already exists (excluding current account)
      const emailExists = await prisma.payPalAccount.findFirst({
        where: {
          email: body.email,
          id: { not: id },
        },
      })

      if (emailExists) {
        return NextResponse.json(
          {
            error: "Conflict",
            message: "Account with this email already exists",
          },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (body.account_name !== undefined) {
      updateData.accountName = body.account_name
    }

    if (body.email !== undefined) {
      updateData.email = body.email
    }

    if (body.sandbox_mode !== undefined) {
      updateData.sandboxMode = body.sandbox_mode
    }

    if (body.active !== undefined) {
      updateData.active = body.active
    }

    // Encrypt credentials if provided
    if (body.client_id) {
      try {
        updateData.clientId = encrypt(body.client_id)
      } catch (error) {
        return NextResponse.json(
          {
            error: "Encryption error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to encrypt client_id",
          },
          { status: 500 }
        )
      }
    }

    if (body.secret_key) {
      try {
        updateData.secretKey = encrypt(body.secret_key)
      } catch (error) {
        return NextResponse.json(
          {
            error: "Encryption error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to encrypt secret_key",
          },
          { status: 500 }
        )
      }
    }

    // Update account
    const updated = await prisma.payPalAccount.update({
      where: { id },
      data: updateData,
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
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating account:", error)
    return NextResponse.json(
      {
        error: "Failed to update account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/accounts/[id]
 * Soft delete - set active = false
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Only admin can delete PayPal accounts
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

    // Soft delete - set active = false
    await prisma.payPalAccount.update({
      where: { id },
      data: {
        active: false,
      },
    })

    return NextResponse.json(
      {
        message: "Account deactivated successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      {
        error: "Failed to delete account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


