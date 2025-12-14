import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/encryption"
import { checkAdmin } from "@/lib/auth/role-check"

interface CreateAccountRequest {
  account_name: string
  email: string
  client_id: string
  secret_key: string
  sandbox_mode?: boolean
}

/**
 * GET /api/accounts
 * List all PayPal accounts
 */
export async function GET(request: NextRequest) {
  try {
    const accounts = await prisma.payPalAccount.findMany({
      select: {
        id: true,
        accountName: true,
        email: true,
        active: true,
        lastSyncAt: true,
        createdAt: true,
        sandboxMode: true,
        _count: {
          select: {
            disputes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transform to include dispute count
    const accountsWithCount = accounts.map((account) => ({
      id: account.id,
      account_name: account.accountName,
      email: account.email,
      active: account.active,
      sandbox_mode: account.sandboxMode,
      last_sync_at: account.lastSyncAt,
      created_at: account.createdAt,
      disputes_count: account._count.disputes,
    }))

    return NextResponse.json(accountsWithCount, { status: 200 })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch accounts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounts
 * Add new PayPal account
 */
export async function POST(request: NextRequest) {
  try {
    // Only admin can create PayPal accounts
    const permissionError = await checkAdmin(request)
    if (permissionError) return permissionError

    const body: CreateAccountRequest = await request.json()

    // Validate required fields
    if (
      !body.account_name ||
      !body.email ||
      !body.client_id ||
      !body.secret_key
    ) {
      return NextResponse.json(
        {
          error: "Validation error",
          message:
            "account_name, email, client_id, and secret_key are required",
        },
        { status: 400 }
      )
    }

    // Validate email format
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

    // Check if email already exists
    const existingAccount = await prisma.payPalAccount.findFirst({
      where: {
        email: body.email,
      },
    })

    if (existingAccount) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Account with this email already exists",
        },
        { status: 409 }
      )
    }

    // Encrypt secret_key
    let encryptedSecretKey: string
    let encryptedClientId: string

    try {
      encryptedSecretKey = encrypt(body.secret_key)
      encryptedClientId = encrypt(body.client_id)
    } catch (error) {
      return NextResponse.json(
        {
          error: "Encryption error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to encrypt credentials",
        },
        { status: 500 }
      )
    }

    // Create account
    const account = await prisma.payPalAccount.create({
      data: {
        accountName: body.account_name,
        email: body.email,
        clientId: encryptedClientId,
        secretKey: encryptedSecretKey,
        sandboxMode: body.sandbox_mode ?? true,
        active: true,
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
        // Do not expose clientId and secretKey
      },
    })

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
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating account:", error)
    return NextResponse.json(
      {
        error: "Failed to create account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
