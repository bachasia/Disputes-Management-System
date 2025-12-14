import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { PayPalClient } from "@/lib/paypal/client"
import { PayPalDisputesAPI } from "@/lib/paypal/disputes"
import { decrypt } from "@/lib/utils/encryption"

/**
 * POST /api/test/paypal
 * Test PayPal credentials for a specific account
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: "Bad Request", message: "accountId is required" },
        { status: 400 }
      )
    }

    // Get account from database
    const account = await prisma.payPalAccount.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Not Found", message: "PayPal account not found" },
        { status: 404 }
      )
    }

    const results: {
      step: string
      success: boolean
      message: string
      data?: any
    }[] = []

    // Step 1: Decrypt credentials
    try {
      const encryptionKey = process.env.ENCRYPTION_KEY
      if (!encryptionKey) {
        return NextResponse.json(
          {
            error: "Configuration Error",
            message: "ENCRYPTION_KEY not found",
          },
          { status: 500 }
        )
      }

      const clientId = decrypt(account.clientId)
      const secretKey = decrypt(account.secretKey)

      results.push({
        step: "Decrypt Credentials",
        success: true,
        message: "Credentials decrypted successfully",
        data: {
          clientId: clientId.substring(0, 10) + "...",
          secretKey: secretKey.substring(0, 10) + "...",
        },
      })
    } catch (error) {
      results.push({
        step: "Decrypt Credentials",
        success: false,
        message: `Failed to decrypt: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return NextResponse.json({ results }, { status: 200 })
    }

    // Step 2: Test OAuth token
    try {
      const paypalClient = new PayPalClient(
        decrypt(account.clientId),
        decrypt(account.secretKey),
        account.sandboxMode
      )

      const token = await paypalClient.getAccessToken()
      results.push({
        step: "OAuth Token",
        success: true,
        message: "OAuth token obtained successfully",
        data: {
          token: token.substring(0, 20) + "...",
        },
      })
    } catch (error: any) {
      results.push({
        step: "OAuth Token",
        success: false,
        message: `Failed to get OAuth token: ${error.message || "Unknown error"}`,
        data: error.response
          ? {
              status: error.response.status,
              error: error.response.data,
            }
          : undefined,
      })
      return NextResponse.json({ results }, { status: 200 })
    }

    // Step 3: Test Disputes API
    try {
      const paypalClient = new PayPalClient(
        decrypt(account.clientId),
        decrypt(account.secretKey),
        account.sandboxMode
      )
      const disputesAPI = new PayPalDisputesAPI(paypalClient)

      const response = await disputesAPI.listDisputes({
        page_size: 1,
      })

      results.push({
        step: "Disputes API",
        success: true,
        message: "Disputes API accessible",
        data: {
          totalItems: response.total_items || 0,
          itemsInResponse: response.items?.length || 0,
          totalPages: response.total_pages || 0,
        },
      })
    } catch (error: any) {
      results.push({
        step: "Disputes API",
        success: false,
        message: `Failed to access Disputes API: ${error.message || "Unknown error"}`,
        data: error.details
          ? {
              statusCode: error.statusCode,
              details: error.details,
            }
          : error.response
          ? {
              status: error.response.status,
              error: error.response.data,
            }
          : undefined,
      })
    }

    const allSuccess = results.every((r) => r.success)

    return NextResponse.json(
      {
        success: allSuccess,
        results,
        account: {
          id: account.id,
          name: account.accountName,
          email: account.email,
          sandbox: account.sandboxMode,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error testing PayPal credentials:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

