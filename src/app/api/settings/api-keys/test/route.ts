import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"

// Force dynamic rendering (uses headers() from NextAuth)
export const dynamic = 'force-dynamic'

interface TestResult {
  service: string
  success: boolean
  message: string
}

// POST /api/settings/api-keys/test - Test API key connections (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can test API keys
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { openaiApiKey, googleAiApiKey, deepseekAiApiKey } = body

    const results: TestResult[] = []

    // Test OpenAI API Key
    if (openaiApiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
        })

        if (response.ok) {
          results.push({
            service: "OpenAI",
            success: true,
            message: "Connection successful",
          })
        } else if (response.status === 401) {
          results.push({
            service: "OpenAI",
            success: false,
            message: "Invalid API key",
          })
        } else {
          results.push({
            service: "OpenAI",
            success: false,
            message: `Error: ${response.status} ${response.statusText}`,
          })
        }
      } catch (error) {
        results.push({
          service: "OpenAI",
          success: false,
          message: error instanceof Error ? error.message : "Connection failed",
        })
      }
    } else {
      results.push({
        service: "OpenAI",
        success: false,
        message: "API key not provided",
      })
    }

    // Test Google AI API Key
    if (googleAiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${googleAiApiKey}`,
          {
            method: "GET",
          }
        )

        if (response.ok) {
          results.push({
            service: "Google AI",
            success: true,
            message: "Connection successful",
          })
        } else if (response.status === 400 || response.status === 403) {
          results.push({
            service: "Google AI",
            success: false,
            message: "Invalid API key",
          })
        } else {
          results.push({
            service: "Google AI",
            success: false,
            message: `Error: ${response.status} ${response.statusText}`,
          })
        }
      } catch (error) {
        results.push({
          service: "Google AI",
          success: false,
          message: error instanceof Error ? error.message : "Connection failed",
        })
      }
    } else {
      results.push({
        service: "Google AI",
        success: false,
        message: "API key not provided",
      })
    }

    // Test Deepseek AI API Key
    if (deepseekAiApiKey) {
      try {
        const response = await fetch("https://api.deepseek.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${deepseekAiApiKey}`,
          },
        })

        if (response.ok) {
          results.push({
            service: "Deepseek AI",
            success: true,
            message: "Connection successful",
          })
        } else if (response.status === 401) {
          results.push({
            service: "Deepseek AI",
            success: false,
            message: "Invalid API key",
          })
        } else {
          results.push({
            service: "Deepseek AI",
            success: false,
            message: `Error: ${response.status} ${response.statusText}`,
          })
        }
      } catch (error) {
        results.push({
          service: "Deepseek AI",
          success: false,
          message: error instanceof Error ? error.message : "Connection failed",
        })
      }
    } else {
      results.push({
        service: "Deepseek AI",
        success: false,
        message: "API key not provided",
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error testing API keys:", error)
    return NextResponse.json(
      {
        error: "Failed to test API keys",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


