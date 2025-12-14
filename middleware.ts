import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("[Middleware] Processing request to:", pathname)

  // Allow access to login page and API auth routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    console.log("[Middleware] Allowing access to:", pathname)
    return NextResponse.next()
  }

  // Get token from JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  console.log("[Middleware] Token exists:", !!token)
  if (token) {
    console.log("[Middleware] Token role:", (token as any)?.role)
  }

  // Check if accessing protected routes
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/disputes") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin")

  console.log("[Middleware] Is protected route:", isProtectedRoute)

  if (isProtectedRoute) {
    // If no token, redirect to login
    if (!token) {
      console.log("[Middleware] No token, redirecting to login")
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin routes
    if (pathname.startsWith("/admin")) {
      const tokenRole = (token as any)?.role
      console.log("[Middleware] Admin route check, role:", tokenRole)
      if (tokenRole !== "admin") {
        console.log("[Middleware] Not admin, redirecting")
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("error", "Unauthorized")
        return NextResponse.redirect(loginUrl)
      }
    }

    console.log("[Middleware] Authorized, allowing access")
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
