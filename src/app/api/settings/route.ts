import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can view system settings
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await prisma.setting.findMany({
      orderBy: { category: "asc" },
    })

    // Convert to key-value object
    const settingsMap: Record<string, string> = {}
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value || ""
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can update system settings
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      )
    }

    // Update or create each setting
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: {
          value: String(value),
          updatedBy: session.user.email || "unknown",
        },
        create: {
          key,
          value: String(value),
          category: "general",
          updatedBy: session.user.email || "unknown",
        },
      })
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}

