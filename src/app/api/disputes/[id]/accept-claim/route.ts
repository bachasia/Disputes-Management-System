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

    // Parse FormData (according to PayPal docs, accept-claim uses multipart/form-data)
    const formData = await request.formData()
    const file = formData.get("accept-claim-document") as File | null
    const note = formData.get("note") as string | null

    // Convert File to Buffer if provided
    let fileBuffer: Buffer | undefined
    let fileName: string | undefined
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      fileName = file.name
    }

    // Accept claim via PayPal API (file is optional according to PayPal docs)
    await disputesAPI.acceptClaim(dispute.disputeId, fileBuffer, fileName)

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
        actionType: "CLAIM_ACCEPTED",
        actionBy: "USER",
        oldValue: dispute.disputeStatus || "",
        newValue: "RESOLVED",
        description: note || "Claim accepted",
        metadata: {
          hasDocument: !!file,
          fileName: file?.name,
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


