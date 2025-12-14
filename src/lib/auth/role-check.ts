import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

/**
 * Check if user has permission to perform write operations (POST, PUT, PATCH, DELETE)
 * VIEWER role can only read (GET), not write
 */
export async function checkWritePermission(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    )
  }

  // VIEWER role can only read, not write
  if (session.user.role === "viewer") {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Viewer role can only view data. Write operations are not allowed.",
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if user is admin
 */
export async function checkAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    )
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden", message: "Admin access required" },
      { status: 403 }
    )
  }

  return null
}

