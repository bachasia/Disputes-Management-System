import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { PayPalClient, PayPalTrackingAPI, TrackingStatus } from "@/lib/paypal"
import { decrypt } from "@/lib/utils/encryption"
import { checkWritePermission } from "@/lib/auth/role-check"

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const { id } = params
    const body = await request.json()

    const {
      transactionId,
      trackingNumber,
      carrier,
      status = "SHIPPED",
      shipmentDate,
      carrierNameOther,
      trackingUrl,
    } = body

    // Validate required fields
    if (!transactionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Transaction ID is required" },
        { status: 400 }
      )
    }

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Bad Request", message: "Tracking number is required" },
        { status: 400 }
      )
    }

    if (!carrier) {
      return NextResponse.json(
        { error: "Bad Request", message: "Carrier is required" },
        { status: 400 }
      )
    }

    // Get dispute with account
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        paypalAccount: true,
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: "Not found", message: "Dispute not found" },
        { status: 404 }
      )
    }

    if (!dispute.paypalAccount) {
      return NextResponse.json(
        { error: "Bad Request", message: "PayPal account not found" },
        { status: 400 }
      )
    }

    // Decrypt credentials
    const clientId = decrypt(dispute.paypalAccount.clientId)
    const secretKey = decrypt(dispute.paypalAccount.secretKey)

    // Create PayPal client
    const paypalClient = new PayPalClient(
      clientId,
      secretKey,
      dispute.paypalAccount.sandboxMode
    )
    const trackingAPI = new PayPalTrackingAPI(paypalClient)

    // Add tracking via PayPal API
    const result = await trackingAPI.addTracking(
      transactionId,
      trackingNumber,
      carrier,
      status as TrackingStatus,
      {
        shipmentDate,
        carrierNameOther,
        trackingUrl,
      }
    )

    // Check for errors in response
    if (result.errors && result.errors.length > 0) {
      console.error("PayPal tracking errors:", result.errors)
      return NextResponse.json(
        {
          error: "PayPal API Error",
          message: result.errors[0]?.message || "Failed to add tracking",
          details: result.errors,
        },
        { status: 400 }
      )
    }

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "TRACKING_ADDED",
        actionBy: "USER",
        description: `Tracking added: ${carrier} - ${trackingNumber}`,
        metadata: {
          transactionId,
          trackingNumber,
          carrier,
          status,
          shipmentDate,
          trackingUrl,
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        trackerIdentifiers: result.tracker_identifiers,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error adding tracking:", error)
    return NextResponse.json(
      {
        error: "Failed to add tracking",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


