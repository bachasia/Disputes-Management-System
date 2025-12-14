import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import { checkWritePermission } from "@/lib/auth/role-check"

/**
 * GET /api/profile
 * Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: {
            expires: true,
          },
          orderBy: {
            expires: "desc",
          },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.sessions[0]?.expires || null,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile
 * Update current user profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Check write permission (block VIEWER)
    const permissionError = await checkWritePermission(request)
    if (permissionError) return permissionError

    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, image } = body

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (image !== undefined) updateData.image = image

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

