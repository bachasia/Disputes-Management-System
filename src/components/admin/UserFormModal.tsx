"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
}

interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UserFormData) => Promise<void>
  user?: User
}

interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: "admin" | "user" | "viewer"
  active: boolean
}

export function UserFormModal({
  open,
  onOpenChange,
  onSubmit,
  user,
}: UserFormModalProps) {
  const isEditing = !!user
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<UserFormData>({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      role: (user?.role as "admin" | "user" | "viewer") || "user",
      active: user?.active ?? true,
    },
  })

  const password = watch("password")
  const active = watch("active")

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
        role: (user.role as "admin" | "user" | "viewer") || "user",
        active: user.active,
      })
    } else {
      reset({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        active: true,
      })
    }
    setError(null)
  }, [user, reset])

  const onFormSubmit = async (data: UserFormData) => {
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate passwords match
      if (data.password && data.password !== data.confirmPassword) {
        setError("Passwords do not match")
        setIsSubmitting(false)
        return
      }

      // Validate password length if provided
      if (data.password && data.password.length < 6) {
        setError("Password must be at least 6 characters")
        setIsSubmitting(false)
        return
      }

      // If editing and no password provided, remove it from data
      const submitData: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.active,
      }

      // Only include password if provided (or if creating new user)
      if (!isEditing || data.password) {
        submitData.password = data.password
      }

      await onSubmit(submitData)
      onOpenChange(false)
      reset()
    } catch (err: any) {
      setError(err.message || "Failed to save user")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update user information. Leave password blank to keep current password."
              : "Create a new user account with email and password."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="user@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password", {
                  required: !isEditing ? "Password is required" : false,
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                placeholder={isEditing ? "Leave blank to keep current" : "••••••"}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {watch("password") && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword", {
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                  placeholder="••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("role")}
                onValueChange={(value) =>
                  setValue("role", value as "admin" | "user" | "viewer")
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active">Account Status</Label>
                <p className="text-sm text-muted-foreground">
                  {active ? "User can log in" : "User account is disabled"}
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={(checked) => setValue("active", checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


