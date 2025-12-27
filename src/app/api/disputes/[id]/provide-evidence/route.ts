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

    // Validate evidence before sending
    if (evidence.length === 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "At least one evidence item is required",
        },
        { status: 400 }
      )
    }

    // Validate that all evidence items have evidence_type
    for (const item of evidence) {
      if (!item.evidence_type) {
        console.error("Evidence item missing evidence_type:", item)
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "All evidence items must have an evidence_type field",
          },
          { status: 400 }
        )
      }
    }

    console.log("[ProvideEvidence] Validated evidence:", JSON.stringify(evidence, null, 2))

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
  } catch (error: any) {
    console.error("Error providing evidence:", error)
    console.error("Error details:", JSON.stringify(error?.details || error, null, 2))
    
    // Handle PayPal API errors with detailed messages
    if (error?.name === "PayPalAPIError" || error?.statusCode || error?.details) {
      const statusCode = error.statusCode || 400
      let errorMessage = error.message || "Failed to provide evidence"
      let userFriendlyMessage = errorMessage
      
      // Extract specific error details from PayPal API response
      const errorDetails = error.details || {}
      if (errorDetails.details && Array.isArray(errorDetails.details)) {
        const issues = errorDetails.details.map((d: any) => d.issue).filter(Boolean)
        console.log("PayPal error issues:", issues)
        
        // Map PayPal error codes to user-friendly messages
        if (issues.includes("MISSING_EVIDENCE_TYPE")) {
          userFriendlyMessage = "Missing evidence type: All evidence items must have an evidence_type field. Please check your evidence data."
        } else if (issues.length > 0) {
          userFriendlyMessage = `PayPal API Error: ${issues.join(", ")}`
        }
      }
      
      return NextResponse.json(
        {
          error: "Failed to provide evidence",
          message: userFriendlyMessage,
          paypalError: errorDetails?.name || error.name,
          paypalDetails: errorDetails?.details,
        },
        { status: statusCode }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      {
        error: "Failed to provide evidence",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
