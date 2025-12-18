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

    // Send message via PayPal API
    const response = await disputesAPI.sendMessage(
      dispute.disputeId,
      body.message,
      body.posted_by,
      body.attachments
    )

    // Save message to database
    if (response.messages && response.messages.length > 0) {
      const latestMessage = response.messages[response.messages.length - 1]
      await prisma.disputeMessage.create({
        data: {
          disputeId: id,
          messageType: latestMessage.posted_by || "SELLER",
          postedBy: latestMessage.posted_by || null,
          content: latestMessage.content || null,
          attachments: latestMessage.attachments || undefined,
          createdAt: new Date(latestMessage.time_posted),
        },
      })
    }

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "MESSAGE_SENT",
        actionBy: body.posted_by || "USER",
        description: "Message sent",
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      {
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


