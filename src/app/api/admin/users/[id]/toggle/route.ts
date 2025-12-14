import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db/prisma"

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

// PATCH /api/admin/users/[id]/toggle - Toggle active status
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const authError = await checkAdmin(request)
  if (authError) return authError

  try {
    const userId = params.id
    const session = await getServerSession(authOptions)

    if (userId === session?.user.id) {
      return NextResponse.json(
        { error: "Cannot toggle your own status" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active: !user.active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error toggling status:", error)
    return NextResponse.json(
      { error: "Failed to toggle status" },
      { status: 500 }
    )
  }
}

