import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

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

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
            accountPermissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, email, password, role, active } = body

    // Validate
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Validate role
    if (role && !["admin", "user", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, user, or viewer" },
        { status: 400 }
      )
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        passwordHash: hashedPassword, // For backward compatibility
        role: role || "user",
        active: active !== undefined ? active : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
