import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/encryption"
import axios from "axios"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/disputes/[id]/ai-assist - Get AI assistance for a dispute
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const disputeId = params.id
    const body = await request.json()
    const { prompt, aiProvider, formData } = body

    if (!aiProvider) {
      return NextResponse.json(
        { error: "AI provider is required" },
        { status: 400 }
      )
    }

    // If formData is provided, use it; otherwise use prompt
    const useFormData = !!formData

    // Get dispute details
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        paypalAccount: true,
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }

    // Get API keys from settings
    const settings = await prisma.setting.findMany({
      where: {
        category: "api_keys",
        key: {
          in: ["openaiApiKey", "googleAiApiKey", "deepseekAiApiKey"],
        },
      },
    })

    const apiKeys: Record<string, string> = {}
    settings.forEach((setting) => {
      try {
        apiKeys[setting.key] = decrypt(setting.value || "")
      } catch (error) {
        console.error(`Error decrypting ${setting.key}:`, error)
      }
    })

    // Build prompt based on whether formData is provided
    let fullPrompt = ""

    if (useFormData && formData) {
      // Build comprehensive prompt from form data
      const formContext = `
You are a professional PayPal dispute resolution specialist. Generate a professional, empathetic, and legally compliant response to a PayPal dispute case.

CASE INFORMATION:
- Dispute Type: ${formData.disputeType === "ITEM_NOT_RECEIVED" ? "Item Not Received" : "Not as Described"}
- Case ID: ${formData.caseId}
- Order ID: ${formData.orderId || "N/A"}
${formData.deliveryDate ? `- Delivery Date: ${formData.deliveryDate}` : ""}
${formData.carrier ? `- Carrier: ${formData.carrier}` : ""}
${formData.trackingNumber ? `- Tracking Number: ${formData.trackingNumber}` : ""}

CUSTOMER COMPLAINT:
${formData.customerComplaint}

SUPPORT ACTIONS ALREADY OFFERED:
${formData.supportActions || "None specified"}

STORE POLICIES:
${formData.returnPolicyUrl ? `- Return/Refund Policy: ${formData.returnPolicyUrl}` : ""}
${formData.shippingPolicyUrl ? `- Shipping Policy: ${formData.shippingPolicyUrl}` : ""}

ADDITIONAL DISPUTE CONTEXT:
- Status: ${dispute.disputeStatus || "N/A"}
- Amount: ${dispute.disputeCurrency || "USD"} ${dispute.disputeAmount || "N/A"}
- Customer: ${dispute.customerName || dispute.customerEmail || "N/A"}
- Original Description: ${dispute.description || "N/A"}

INSTRUCTIONS:
1. Write a professional, empathetic response that addresses the customer's complaint directly
2. Reference any tracking information, delivery dates, or policies provided
3. If support actions were already offered, acknowledge them and provide additional solutions if appropriate
4. Maintain a professional and helpful tone throughout
5. Include relevant policy links if provided
6. Keep the response concise but comprehensive (approximately 200-300 words)
7. Focus on resolving the dispute amicably while protecting the seller's interests
8. Use proper business language suitable for PayPal's resolution center

Generate the response now:
`

      fullPrompt = formContext
    } else {
      // Build context from dispute for simple prompt mode
      const disputeContext = `
Dispute Information:
- Case ID: ${dispute.disputeId}
- Status: ${dispute.disputeStatus || "N/A"}
- Reason: ${dispute.disputeReason || "N/A"}
- Type: ${dispute.disputeType || "N/A"}
- Amount: ${dispute.disputeCurrency || "USD"} ${dispute.disputeAmount || "N/A"}
- Customer: ${dispute.customerName || dispute.customerEmail || "N/A"}
- Invoice Number: ${dispute.invoiceNumber || "N/A"}
- Description: ${dispute.description || "N/A"}
- Created: ${dispute.disputeCreateTime ? new Date(dispute.disputeCreateTime).toISOString() : "N/A"}
`

      fullPrompt = `${disputeContext}\n\nUser Request: ${prompt || "Help me draft a professional response to this dispute"}`
    }

    let aiResponse = ""

    try {
      if (aiProvider === "openai") {
        const apiKey = apiKeys.openaiApiKey
        if (!apiKey) {
          return NextResponse.json(
            { error: "OpenAI API key not configured" },
            { status: 400 }
          )
        }

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant specialized in PayPal dispute resolution. Provide clear, professional, and actionable advice.",
              },
              {
                role: "user",
                content: fullPrompt,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        )

        aiResponse = response.data.choices[0]?.message?.content || "No response generated"
      } else if (aiProvider === "google") {
        const apiKey = apiKeys.googleAiApiKey
        if (!apiKey) {
          return NextResponse.json(
            { error: "Google AI API key not configured" },
            { status: 400 }
          )
        }

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `You are a helpful assistant specialized in PayPal dispute resolution. Provide clear, professional, and actionable advice.\n\n${fullPrompt}`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        )

        aiResponse =
          response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No response generated"
      } else if (aiProvider === "deepseek") {
        const apiKey = apiKeys.deepseekAiApiKey
        if (!apiKey) {
          return NextResponse.json(
            { error: "Deepseek AI API key not configured" },
            { status: 400 }
          )
        }

        const response = await axios.post(
          "https://api.deepseek.com/v1/chat/completions",
          {
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant specialized in PayPal dispute resolution. Provide clear, professional, and actionable advice.",
              },
              {
                role: "user",
                content: fullPrompt,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        )

        aiResponse = response.data.choices[0]?.message?.content || "No response generated"
      } else {
        return NextResponse.json(
          { error: "Invalid AI provider" },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        response: aiResponse,
        provider: aiProvider,
      })
    } catch (error: any) {
      console.error(`Error calling ${aiProvider} API:`, error)
      return NextResponse.json(
        {
          error: `Failed to get AI response: ${error.response?.data?.error?.message || error.message || "Unknown error"}`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in AI assist endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

