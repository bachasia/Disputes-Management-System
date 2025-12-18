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

    // Parse FormData
    const formData = await request.formData()
    const files = formData.getAll("evidence-file") as File[]
    const evidenceJson = formData.get("evidence")

    let evidence: any[] = []
    let note: string | undefined

    // Parse evidence JSON if provided
    if (evidenceJson && typeof evidenceJson === "string") {
      try {
        const evidenceData = JSON.parse(evidenceJson)
        evidence = evidenceData.evidence || []
        note = evidenceData.note
      } catch (e) {
        console.error("Error parsing evidence JSON:", e)
      }
    }

    // Determine evidence type based on what's being provided
    const getEvidenceType = (fileName: string, hasTracking: boolean): string => {
      const lowerName = fileName.toLowerCase()
      if (hasTracking || lowerName.includes("tracking") || lowerName.includes("delivery")) {
        return "PROOF_OF_FULFILLMENT"
      }
      if (lowerName.includes("refund")) {
        return "PROOF_OF_REFUND"
      }
      return "OTHER"
    }

    const hasTrackingInfo = evidence.some(e => 
      e.evidence_type === "PROOF_OF_FULFILLMENT" || 
      e.evidence_info?.tracking_info?.length
    )

    // Provide evidence via PayPal API
    // Priority: If files are provided, use file upload method (multipart/form-data)
    // Otherwise, use JSON method for tracking info and notes
    if (files.length > 0) {
      // For each file, call PayPal API with multipart/form-data
      // According to PayPal docs, each file should be sent separately
      for (const file of files) {
        const evidenceType = getEvidenceType(file.name, hasTrackingInfo)
        
        // Convert File to Buffer for Node.js form-data package
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        await disputesAPI.provideEvidenceWithFile(
          dispute.disputeId,
          buffer,
          file.name,
          evidenceType
        )
      }
      
      // If there's also tracking info or note, send them separately via JSON
      if (evidence.length > 0 || note) {
        await disputesAPI.provideEvidence(
          dispute.disputeId,
          evidence,
          note
        )
      }
    } else if (evidence.length > 0) {
      // Only JSON method if no files
      await disputesAPI.provideEvidence(
        dispute.disputeId,
        evidence,
        note
      )
    } else {
      return NextResponse.json(
        { error: "Bad Request", message: "Please provide at least one piece of evidence" },
        { status: 400 }
      )
    }

    // Create history record
    await prisma.disputeHistory.create({
      data: {
        disputeId: id,
        actionType: "EVIDENCE_PROVIDED",
        actionBy: "USER",
        description: note || `Evidence provided${files.length > 0 ? ` with ${files.length} file(s)` : ""}`,
        metadata: { 
          evidence: evidence.length > 0 ? evidence : undefined,
          filesCount: files.length,
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


