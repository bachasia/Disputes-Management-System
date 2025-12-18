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

    // Accept claim (Full Refund) via PayPal API
    await disputesAPI.acceptClaim(dispute.disputeId, {
      note: body.note,
      acceptClaimReason: body.acceptClaimReason,
      refundAmount: body.refundAmount ? {
        currencyCode: body.refundAmount.currencyCode,
        value: body.refundAmount.value,
      } : undefined,
      invoiceId: body.invoiceId,
    })

    // Update dispute status
    await prisma.dispute.update({
      where: { id },
      data: {
        disputeStatus: "RESOLVED",
        resolvedAt: new Date(),
      },
    })

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "FULL_REFUND",
        actionBy: "USER",
        oldValue: dispute.disputeStatus || "",
        newValue: "RESOLVED",
        description: body.note || "Full refund issued",
        metadata: {
          reason: body.acceptClaimReason,
          refundAmount: body.refundAmount,
        },
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error accepting claim:", error)
    return NextResponse.json(
      {
        error: "Failed to accept claim",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


