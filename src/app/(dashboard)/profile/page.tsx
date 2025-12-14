"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { format } from "date-fns"
import { Eye, EyeOff, Loader2, Save, Lock, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/user/UserAvatar"
import { RoleBadge } from "@/components/user/RoleBadge"

interface ProfileData {
  name: string
  email: string
  role: string
  image: string | null
  createdAt: string
  lastLogin: string | null
}

interface ProfileFormData {
  name: string
}

interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [profile, setProfile] = React.useState<ProfileData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<ChangePasswordFormData>()

  const newPassword = watchPassword("newPassword")

  // Fetch profile data
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }
        const data = await response.json()
        setProfile(data)
        resetProfile({ name: data.name || "" })
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchProfile()
    }
  }, [session, resetProfile])

  const handleUpdateProfile = async (data: ProfileFormData) => {
    setIsUpdating(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      const updated = await response.json()
      setProfile((prev) => (prev ? { ...prev, ...updated } : null))
      await update() // Refresh session
      toast.success("Profile updated successfully")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true)
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to change password")
      }

      toast.success("Password changed successfully! Please login again.")
      resetPassword()
      setTimeout(() => {
        signOut({ callbackUrl: "/login" })
      }, 2000)
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast.error(error.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information and security settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile(handleUpdateProfile)} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <UserAvatar
                    name={profile.name || undefined}
                    email={profile.email}
                    image={profile.image || undefined}
                    size="lg"
                  />
                  <div>
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-sm text-muted-foreground">
                      Avatar upload coming soon
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...registerProfile("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    placeholder="Your name"
                  />
                  {profileErrors.name && (
                    <p className="text-sm text-destructive">
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>

                {/* Email (readonly) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                {/* Role (readonly) */}
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <RoleBadge role={profile.role} />
                  </div>
                </div>

                {/* Created Date (readonly) */}
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                {/* Last Login (readonly) */}
                <div className="space-y-2">
                  <Label>Last Login</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.lastLogin
                      ? format(new Date(profile.lastLogin), "MMMM d, yyyy 'at' h:mm a")
                      : "Never"}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmitPassword(handleChangePassword)}
                className="space-y-6"
              >
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    Current Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      {...registerPassword("currentPassword", {
                        required: "Current password is required",
                      })}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    New Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      {...registerPassword("newPassword", {
                        required: "New password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                        validate: {
                          hasUppercase: (value) =>
                            /[A-Z]/.test(value) ||
                            "Password must contain at least one uppercase letter",
                          hasNumber: (value) =>
                            /[0-9]/.test(value) ||
                            "Password must contain at least one number",
                        },
                      })}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                  {newPassword && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Password requirements:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li
                          className={
                            newPassword.length >= 6 ? "text-green-600" : ""
                          }
                        >
                          At least 6 characters
                        </li>
                        <li
                          className={
                            /[A-Z]/.test(newPassword) ? "text-green-600" : ""
                          }
                        >
                          At least 1 uppercase letter
                        </li>
                        <li
                          className={
                            /[0-9]/.test(newPassword) ? "text-green-600" : ""
                          }
                        >
                          At least 1 number
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm New Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      {...registerPassword("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === newPassword || "Passwords do not match",
                      })}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

