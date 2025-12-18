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
    const contentType = request.headers.get("content-type") || ""

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

    let evidence: any[] = []
    let note: string | undefined
    let files: Array<{ buffer: Buffer; filename: string; contentType: string }> = []

    // Check if request is multipart/form-data (has files)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      
      // Get input JSON
      const inputField = formData.get("input")
      if (inputField && typeof inputField === "string") {
        try {
          const inputData = JSON.parse(inputField)
          evidence = inputData.evidence || []
          note = inputData.note
        } catch (e) {
          console.error("Failed to parse input JSON:", e)
        }
      }
      
      // Get files
      const fileEntries = formData.getAll("evidence_file")
      for (const entry of fileEntries) {
        if (entry instanceof File) {
          const arrayBuffer = await entry.arrayBuffer()
          files.push({
            buffer: Buffer.from(arrayBuffer),
            filename: entry.name,
            contentType: entry.type || "application/octet-stream",
          })
        }
      }
    } else {
      // JSON request
      const body = await request.json()
      evidence = body.evidence || []
      note = body.note
    }

    // Provide evidence via PayPal API
    if (files.length > 0) {
      // Use multipart upload with files
      await disputesAPI.provideEvidenceWithFiles(
        dispute.disputeId,
        evidence,
        files,
        note
      )
    } else {
      // Use JSON-only endpoint
      await disputesAPI.provideEvidence(
        dispute.disputeId,
        evidence,
        note
      )
    }

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "EVIDENCE_PROVIDED",
        actionBy: "USER",
        description: note || "Evidence provided",
        metadata: { 
          evidence,
          filesCount: files.length,
          fileNames: files.map(f => f.filename),
        },
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error providing evidence:", error)
    return NextResponse.json(
      {
        error: "Failed to provide evidence",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
