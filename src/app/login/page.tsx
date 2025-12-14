"use client"

import * as React from "react"
import { Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, Loader2, Shield, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormData {
  email: string
  password: string
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [loginError, setLoginError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const callbackUrl = searchParams.get("callbackUrl") || "/disputes"
  const error = searchParams.get("error")

  // Security: Remove sensitive query params from URL
  React.useEffect(() => {
    const email = searchParams.get("email")
    const password = searchParams.get("password")
    
    // If email or password are in URL, remove them immediately for security
    if (email || password) {
      console.warn("[Security] Sensitive credentials detected in URL, removing...")
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("email")
      newSearchParams.delete("password")
      
      const newUrl = newSearchParams.toString()
        ? `/login?${newSearchParams.toString()}`
        : "/login"
      
      // Replace URL without sensitive params (no page reload)
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, router])

  React.useEffect(() => {
    if (error) {
      if (error === "CredentialsSignin") {
        toast.error("Invalid email or password")
      } else {
        toast.error("An error occurred during login")
      }
    }
  }, [error])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoginError(null) // Clear previous errors
    
    try {
      // Trim email to avoid whitespace issues and normalize to lowercase
      const email = data.email.trim().toLowerCase()
      const password = data.password

      // Validate email format
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setLoginError("Please enter a valid email address")
        setIsLoading(false)
        return
      }

      // Validate password
      if (!password || password.length === 0) {
        setLoginError("Please enter your password")
        setIsLoading(false)
        return
      }

      console.log("[Login] Attempting login for:", email)

      const result = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false,
      })

      console.log("[Login] SignIn result:", { ok: result?.ok, error: result?.error })

      if (result?.error) {
        console.error("[Login] SignIn error:", result.error)
        let errorMessage = "Invalid email or password. Please check your credentials and try again."
        
        if (result.error === "CredentialsSignin") {
          errorMessage = "Invalid email or password. Please check your credentials and try again."
        } else if (result.error.includes("deactivated")) {
          errorMessage = "Your account has been deactivated. Please contact an administrator."
        } else {
          errorMessage = `Login failed: ${result.error}`
        }
        
        setLoginError(errorMessage)
        toast.error(errorMessage)
      } else if (result?.ok) {
        console.log("[Login] Login successful, redirecting to:", callbackUrl)
        setLoginError(null)
        toast.success("Login successful!")
        // Small delay to ensure session is set
        setTimeout(() => {
          router.push(callbackUrl)
          router.refresh()
        }, 100)
      } else {
        const errorMessage = "An unexpected error occurred. Please try again."
        setLoginError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("[Login] Unexpected error:", error)
      const errorMessage = "An error occurred during login. Please try again."
      setLoginError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">PayPal Disputes Dashboard</CardTitle>
          <CardDescription>
            Sign in to manage your PayPal disputes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-4"
            method="POST"
            action="#"
          >
            {/* Error from URL params (NextAuth redirect) */}
            {error && error !== "CredentialsSignin" && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>An error occurred. Please try again.</span>
              </div>
            )}

            {/* Error from form submission */}
            {loginError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{loginError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email format",
                  },
                })}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p className="text-xs">Default credentials (change after first login):</p>
            <p className="mt-2 font-mono text-xs break-all">
              Admin: admin@example.com / Admin@123456
            </p>
            <p className="font-mono text-xs break-all">
              User: user@example.com / User@123456
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">PayPal Disputes Dashboard</CardTitle>
            <CardDescription>
              Sign in to manage your PayPal disputes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

