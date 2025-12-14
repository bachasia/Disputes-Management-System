import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { checkWritePermission } from "@/lib/auth/role-check"

/**
 * POST /api/profile/change-password
 * Change current user password
 */
export async function POST(request: NextRequest) {
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
    const { currentPassword, newPassword, confirmPassword } = body

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      )
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      )
    }

    // Validate password requirements
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Check for at least 1 uppercase letter
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      )
    }

    // Check for at least 1 number
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 }
      )
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Verify current password
    const passwordToCheck = user.password || user.passwordHash
    if (!passwordToCheck) {
      return NextResponse.json(
        { error: "Password not set" },
        { status: 400 }
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      passwordToCheck
    )

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, passwordToCheck)
    if (isSamePassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        passwordHash: hashedPassword, // For backward compatibility
      },
    })

    return NextResponse.json({
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}

