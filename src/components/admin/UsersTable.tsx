"use client"

import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Edit, Trash2, Power, MoreVertical } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user/UserAvatar"
import { RoleBadge } from "@/components/user/RoleBadge"
import { Badge } from "@/components/ui/badge"

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
}

interface UsersTableProps {
  users: User[]
  currentUserId: string
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onToggleStatus: (user: User) => void
}

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onDelete,
  onToggleStatus,
}: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isCurrentUser = user.id === currentUserId
              const cannotModify = isCurrentUser

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={user.name || undefined}
                        email={user.email}
                        size="sm"
                      />
                      <span className="font-medium">
                        {user.name || "No name"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.active ? "default" : "secondary"}
                      className={
                        user.active
                          ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300"
                      }
                    >
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user._count?.sessions && user._count.sessions > 0
                      ? `${user._count.sessions} session(s)`
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEdit(user)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleStatus(user)}
                          disabled={cannotModify}
                          className="cursor-pointer"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {user.active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(user)}
                          disabled={cannotModify}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

