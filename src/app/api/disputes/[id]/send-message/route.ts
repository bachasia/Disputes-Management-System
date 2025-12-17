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

    // Check if dispute is INQUIRY stage (required for send-message)
    if (dispute.disputeType?.toUpperCase() !== "INQUIRY") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Send message is only available for disputes in INQUIRY stage",
        },
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

    // Parse FormData (according to PayPal docs, send-message uses multipart/form-data)
    const formData = await request.formData()
    const file = formData.get("message_document") as File | null
    const note = formData.get("note") as string | null

    // Send message via PayPal API (file is optional according to PayPal docs)
    await disputesAPI.sendMessage(dispute.disputeId, file || undefined)

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "MESSAGE_SENT",
        actionBy: "USER",
        description: note || `Message sent${file ? ` with document: ${file.name}` : ""}`,
        metadata: {
          hasDocument: !!file,
          fileName: file?.name,
        },
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


