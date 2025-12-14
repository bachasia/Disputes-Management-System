import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/utils/encryption"

// Force dynamic rendering (uses headers() from NextAuth)
export const dynamic = 'force-dynamic'

// GET /api/settings/api-keys - Get API keys (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can view API keys
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await prisma.setting.findMany({
      where: {
        category: "api_keys",
      },
    })

    const apiKeys: Record<string, string> = {}
    settings.forEach((setting) => {
      try {
        // Decrypt the API key
        apiKeys[setting.key] = decrypt(setting.value || "")
      } catch (error) {
        console.error(`Error decrypting ${setting.key}:`, error)
        apiKeys[setting.key] = ""
      }
    })

    return NextResponse.json({
      openaiApiKey: apiKeys.openaiApiKey || "",
      googleAiApiKey: apiKeys.googleAiApiKey || "",
      deepseekAiApiKey: apiKeys.deepseekAiApiKey || "",
    })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    )
  }
}

// PUT /api/settings/api-keys - Update API keys (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can update API keys
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { openaiApiKey, googleAiApiKey, deepseekAiApiKey } = body

    // Encrypt and save each API key
    const updates = []

    if (openaiApiKey !== undefined) {
      // If empty string, delete the setting; otherwise encrypt and save
      if (!openaiApiKey || openaiApiKey.trim() === "") {
        // Delete the setting if empty
        updates.push(
          prisma.setting.deleteMany({
            where: { key: "openaiApiKey" },
          })
        )
      } else {
        const encrypted = encrypt(openaiApiKey.trim())
        updates.push(
          prisma.setting.upsert({
            where: { key: "openaiApiKey" },
            update: {
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
            create: {
              key: "openaiApiKey",
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
          })
        )
      }
    }

    if (googleAiApiKey !== undefined) {
      // If empty string, delete the setting; otherwise encrypt and save
      if (!googleAiApiKey || googleAiApiKey.trim() === "") {
        // Delete the setting if empty
        updates.push(
          prisma.setting.deleteMany({
            where: { key: "googleAiApiKey" },
          })
        )
      } else {
        const encrypted = encrypt(googleAiApiKey.trim())
        updates.push(
          prisma.setting.upsert({
            where: { key: "googleAiApiKey" },
            update: {
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
            create: {
              key: "googleAiApiKey",
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
          })
        )
      }
    }

    if (deepseekAiApiKey !== undefined) {
      // If empty string, delete the setting; otherwise encrypt and save
      if (!deepseekAiApiKey || deepseekAiApiKey.trim() === "") {
        // Delete the setting if empty
        updates.push(
          prisma.setting.deleteMany({
            where: { key: "deepseekAiApiKey" },
          })
        )
      } else {
        const encrypted = encrypt(deepseekAiApiKey.trim())
        updates.push(
          prisma.setting.upsert({
            where: { key: "deepseekAiApiKey" },
            update: {
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
            create: {
              key: "deepseekAiApiKey",
              value: encrypted,
              category: "api_keys",
              updatedBy: session.user.email || "unknown",
            },
          })
        )
      }
    }

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating API keys:", error)
    return NextResponse.json(
      { error: "Failed to update API keys" },
      { status: 500 }
    )
  }
}

