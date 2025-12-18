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

    // Extract tracking info from evidence array if provided
    let trackingInfo: { carrier_name: string; tracking_number: string } | undefined
    
    for (const e of evidence) {
      if (e.evidence_info?.tracking_info?.length > 0) {
        const track = e.evidence_info.tracking_info[0]
        if (track.carrier_name && track.tracking_number) {
          trackingInfo = {
            carrier_name: track.carrier_name,
            tracking_number: track.tracking_number,
          }
          break
        }
      }
    }

    // Determine evidence type based on dispute reason
    // PROOF_OF_FULFILLMENT is ONLY for "Item Not Received" (INR) disputes
    // For "Item Not As Described" (SNAD) and other disputes, use OTHER
    const getEvidenceType = (disputeReason: string | null, hasTracking: boolean): string => {
      const reason = disputeReason?.toUpperCase() || ""
      
      // Only use PROOF_OF_FULFILLMENT for INR disputes with tracking info
      if (reason.includes("NOT_RECEIVED") && hasTracking) {
        return "PROOF_OF_FULFILLMENT"
      }
      
      // For all other disputes (including SNAD), use OTHER
      return "OTHER"
    }

    const evidenceType = getEvidenceType(dispute.disputeReason, !!trackingInfo)
    console.log(`[ProvideEvidence] Dispute reason: ${dispute.disputeReason}, Evidence type: ${evidenceType}`)

    // Provide evidence via PayPal API
    // IMPORTANT: All files must be uploaded in ONE request!
    // After first submission, dispute state changes and no more evidence can be added.
    if (files.length > 0) {
      // Convert all Files to Buffers
      const fileBuffers: Array<{ buffer: Buffer; name: string }> = []
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fileBuffers.push({ buffer, name: file.name })
      }
      
      // Upload ALL files in ONE request
      await disputesAPI.provideEvidenceWithFiles(
        dispute.disputeId,
        fileBuffers,
        evidenceType,
        trackingInfo,
        note
      )
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


