import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

interface RouteParams {
  params: {
    id: string
  }
}

// Middleware check admin
async function checkAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 403 }
    )
  }

  return null
}

// GET /api/admin/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
            accountPermissions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, email, password, role, active } = body
    const userId = params.id

    const session = await getServerSession(authOptions)

    // Prevent admin from deactivating themselves
    if (userId === session?.user.id && active === false) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        )
      }

      // Check if email already exists (excluding current user)
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
        },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        )
      }
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Validate role if provided
    if (role && !["admin", "user", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, user, or viewer" },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (active !== undefined) updateData.active = active

    // Hash new password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
      updateData.passwordHash = hashedPassword // For backward compatibility
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const userId = params.id
    const session = await getServerSession(authOptions)

    // Prevent admin from deleting themselves
    if (userId === session?.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
