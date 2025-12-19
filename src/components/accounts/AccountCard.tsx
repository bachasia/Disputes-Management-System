"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Edit, Trash2, RefreshCw, CheckCircle2, ChevronDown, Loader2, MoreVertical, Power, PowerOff } from "lucide-react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface AccountCardProps {
  account: {
    id: string
    account_name: string
    email: string
    active: boolean
    sandbox_mode: boolean
    last_sync_at: string | null
    disputes_count: number
  }
  onEdit: (account: any) => void
  onDelete: (accountId: string) => void
  onSync: (accountId: string, syncType?: "incremental" | "90days" | "full") => void
  syncing?: boolean
  onTest?: (accountId: string) => void
  testing?: boolean
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onSync,
  onTest,
  testing = false,
  syncing = false,
  onToggleActive,
  onHardDelete,
}: AccountCardProps) {
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "viewer"
  const isAdmin = session?.user?.role === "admin"
  const canManageAccounts = isAdmin // Only admin can manage PayPal accounts
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{account.account_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={account.sandbox_mode ? "secondary" : "default"}>
              {account.sandbox_mode ? "Sandbox" : "Live"}
            </Badge>
            <Badge variant={account.active ? "default" : "outline"}>
              {account.active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sync:</span>
              <span>
                {account.last_sync_at
                  ? formatDistanceToNow(new Date(account.last_sync_at), {
                      addSuffix: true,
                    })
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disputes:</span>
              <span className="font-medium">{account.disputes_count}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {onTest && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onTest(account.id)}
                disabled={testing}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {testing ? "Testing..." : "Test"}
              </Button>
            )}
            {canManageAccounts && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(account)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {!isViewer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sync Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onSync(account.id, "incremental")}
                    disabled={syncing}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">Incremental Sync</span>
                      <span className="text-xs text-muted-foreground">
                        Only updated disputes
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onSync(account.id, "90days")}
                    disabled={syncing}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">Sync Last 90 Days</span>
                      <span className="text-xs text-muted-foreground">
                        All disputes from last 90 days
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onSync(account.id, "full")}
                    disabled={syncing}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">Full Sync</span>
                      <span className="text-xs text-muted-foreground">
                        All disputes from beginning
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

