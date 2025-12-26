import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { PayPalClient, PayPalDisputesAPI, PayPalAPIError } from "@/lib/paypal"
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
  } catch (error: any) {
    console.error("Error sending message:", error)
    console.error("Error type:", error?.constructor?.name)
    console.error("Error name:", error?.name)
    console.error("Error statusCode:", error?.statusCode)
    console.error("Error details:", JSON.stringify(error?.details, null, 2))
    
    // Handle PayPal API errors with detailed messages
    // Check for PayPalAPIError by name, statusCode, or details structure
    const isPayPalError = 
      error?.name === "PayPalAPIError" || 
      error?.constructor?.name === "PayPalAPIError" ||
      (error?.statusCode && error?.statusCode >= 400 && error?.statusCode < 500) ||
      (error?.details && typeof error.details === "object" && error.details.details)
    
    if (isPayPalError) {
      const statusCode = error.statusCode || 422
      let errorMessage = error.message || "Failed to send message"
      let userFriendlyMessage = errorMessage
      
      // Extract specific error details from PayPal API response
      const errorDetails = error.details || {}
      if (errorDetails.details && Array.isArray(errorDetails.details)) {
        const issues = errorDetails.details.map((d: any) => d.issue).filter(Boolean)
        console.log("PayPal error issues:", issues)
        
        // Map PayPal error codes to user-friendly messages
        if (issues.includes("ACTION_NOT_ALLOWED_IN_CURRENT_DISPUTE_STATE")) {
          userFriendlyMessage = "Cannot send message: This action is not allowed in the current dispute state. The dispute may be resolved, closed, or in a state that doesn't allow sending messages."
        } else if (issues.length > 0) {
          userFriendlyMessage = `PayPal API Error: ${issues.join(", ")}`
        }
      }
      
      console.log("Returning PayPal error response:", { statusCode, userFriendlyMessage })
      return NextResponse.json(
        {
          error: "Failed to send message",
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
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


