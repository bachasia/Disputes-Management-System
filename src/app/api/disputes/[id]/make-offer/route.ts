import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { PayPalClient, PayPalDisputesAPI } from "@/lib/paypal"
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

    // Validate required fields
    if (!body.note || !body.offer_type || !body.offer_amount) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "note, offer_type, and offer_amount are required",
        },
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
    const disputesAPI = new PayPalDisputesAPI(paypalClient)

    // Prepare offer request
    const offerRequest: any = {
      note: body.note,
      offer_type: body.offer_type,
      offer_amount: {
        currency_code: body.offer_amount.currency_code || dispute.disputeCurrency || "USD",
        value: body.offer_amount.value,
      },
    }

    // Add optional fields
    if (body.return_shipping_address) {
      offerRequest.return_shipping_address = body.return_shipping_address
    }

    if (body.invoice_id) {
      offerRequest.invoice_id = body.invoice_id
    }

    // Make offer via PayPal API
    await disputesAPI.makeOffer(dispute.disputeId, offerRequest)

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "OFFER_MADE",
        actionBy: "USER",
        description: body.note || `Offer made: ${body.offer_type} - ${body.offer_amount.value} ${body.offer_amount.currency_code || dispute.disputeCurrency || "USD"}`,
        metadata: {
          offer_type: body.offer_type,
          offer_amount: body.offer_amount,
          return_shipping_address: body.return_shipping_address,
          invoice_id: body.invoice_id,
        },
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error making offer:", error)
    return NextResponse.json(
      {
        error: "Failed to make offer",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

