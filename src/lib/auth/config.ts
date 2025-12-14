import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing credentials")
            throw new Error("Invalid credentials")
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            console.log("[Auth] User not found:", credentials.email)
            throw new Error("Invalid credentials")
          }

          console.log("[Auth] User found:", user.email, "Active:", user.active)

          if (!user.active) {
            console.log("[Auth] User account is deactivated")
            throw new Error("Account is deactivated")
          }

          // Check password field (NextAuth) or passwordHash (backward compatibility)
          const passwordToCheck = user.password || user.passwordHash

          if (!passwordToCheck) {
            console.log("[Auth] No password found for user")
            throw new Error("Invalid credentials")
          }

          console.log("[Auth] Comparing password...")
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            passwordToCheck
          )

          console.log("[Auth] Password valid:", isPasswordValid)

          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("[Auth] Authorization error:", error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.role = (user as any).role
        token.id = user.id
        token.name = user.name
        token.email = user.email
      }

      // When update() is called, fetch fresh user data
      if (trigger === "update" && token.id) {
        try {
          const updatedUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
            },
          })

          if (updatedUser) {
            token.name = updatedUser.name
            token.email = updatedUser.email
            token.role = updatedUser.role
            token.picture = updatedUser.image || undefined
          }
        } catch (error) {
          console.error("[Auth] Error fetching updated user:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role as string
        ;(session.user as any).id = token.id as string
        session.user.name = token.name as string | null
        session.user.email = token.email as string
        session.user.image = token.picture as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

