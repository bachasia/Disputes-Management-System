import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { checkWritePermission } from "@/lib/auth/role-check"

// GET /api/settings/user-preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    let userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    })

    // If no preferences exist, return defaults
    if (!userPreference) {
      const defaultPreferences = {
        timezone: "UTC",
        dateFormat: "MM/dd/yyyy",
        timeFormat: "24h",
        itemsPerPage: 20,
        defaultStatusFilter: "all",
        defaultAccountFilter: "all",
        rememberLastFilters: true,
        defaultSort: "disputeCreateTime",
        defaultSortOrder: "desc",
        columnsToDisplay: [
          "disputeId",
          "status",
          "amount",
          "customer",
          "createTime",
          "account",
        ],
      }

      return NextResponse.json({ preferences: defaultPreferences })
    }

    return NextResponse.json({
      preferences: userPreference.preferences as any,
    })
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch user preferences" },
      { status: 500 }
    )
  }
}

// PUT /api/settings/user-preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences data" },
        { status: 400 }
      )
    }

    // Upsert user preferences
    await prisma.userPreference.upsert({
      where: { userId },
      update: {
        preferences: preferences as any,
      },
      create: {
        userId,
        preferences: preferences as any,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user preferences:", error)
    return NextResponse.json(
      { error: "Failed to update user preferences" },
      { status: 500 }
    )
  }
}

