"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Users as UsersIcon, Shield, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersTable } from "@/components/admin/UsersTable"
import { UserFormModal } from "@/components/admin/UserFormModal"
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    sessions: number
    accountPermissions: number
  }
  // For backward compatibility
  created_at?: string
  last_login?: string | null
}

export default function UsersManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [formModalOpen, setFormModalOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)

  // Check if current user is admin
  React.useEffect(() => {
    if (status === "loading") return

    if (!session || session.user.role !== "admin") {
      router.push("/disputes")
      return
    }
  }, [session, status, router])

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/disputes")
          return
        }
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      alert("Failed to fetch users. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchUsers()
    }
  }, [session, fetchUsers])

  // Handle add user
  const handleAddUser = async (formData: any) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create user")
      }

      await fetchUsers()
      alert("User created successfully!")
    } catch (error: any) {
      console.error("Error adding user:", error)
      throw error
    }
  }

  // Handle edit user
  const handleEditUser = async (formData: any) => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update user")
      }

      await fetchUsers()
      alert("User updated successfully!")
    } catch (error: any) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete user")
      }

      await fetchUsers()
      alert("User deleted successfully!")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      alert(error.message || "Failed to delete user. Please try again.")
      throw error
    }
  }

  // Handle toggle status
  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update user status")
      }

      await fetchUsers()
      alert(`User ${user.active ? "deactivated" : "activated"} successfully!`)
    } catch (error: any) {
      console.error("Error toggling user status:", error)
      alert(error.message || "Failed to update user status. Please try again.")
    }
  }

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user)
    setFormModalOpen(true)
  }

  const handleOpenDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleFormSubmit = async (formData: any) => {
    if (selectedUser) {
      await handleEditUser(formData)
    } else {
      await handleAddUser(formData)
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.active).length
    const admins = users.filter((u) => u.role === "admin").length
    const inactive = total - active

    return { total, active, inactive, admins }
  }, [users])

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage admin accounts and permissions
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedUser(null)
            setFormModalOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Can log in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Disabled accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Admin privileges</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={users}
            currentUserId={session.user.id}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onToggleStatus={handleToggleStatus}
          />
        </CardContent>
      </Card>

      {/* Form Modal */}
      <UserFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSubmit={handleFormSubmit}
        user={selectedUser || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        userName={selectedUser?.name}
        userEmail={selectedUser?.email}
      />
    </div>
  )
}

