"use client"

import * as React from "react"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

interface UserPreferencesData {
  defaultStatusFilter: string
  defaultAccountFilter: string
  rememberLastFilters: boolean
  defaultSort: string
  defaultSortOrder: string
  columnsToDisplay: string[]
}

const AVAILABLE_COLUMNS = [
  { id: "disputeId", label: "Dispute ID" },
  { id: "status", label: "Status" },
  { id: "amount", label: "Amount" },
  { id: "customer", label: "Customer" },
  { id: "invoiceNumber", label: "Invoice Number" },
  { id: "createTime", label: "Created" },
  { id: "account", label: "Account" },
  { id: "reason", label: "Reason" },
]

export function UserPreferences() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [preferences, setPreferences] = React.useState<UserPreferencesData>({
    defaultStatusFilter: "all",
    defaultAccountFilter: "all",
    rememberLastFilters: true,
    defaultSort: "disputeCreateTime",
    defaultSortOrder: "desc",
    columnsToDisplay: [
      "disputeId",
      "status",
      "amount",
      "customer",
      "createTime",
      "account",
    ],
  })

  React.useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/settings/user-preferences")

      if (response.ok) {
        const data = await response.json()
        const prefs = data.preferences || {}
        setPreferences({
          defaultStatusFilter: prefs.defaultStatusFilter || "all",
          defaultAccountFilter: prefs.defaultAccountFilter || "all",
          rememberLastFilters: prefs.rememberLastFilters !== false,
          defaultSort: prefs.defaultSort || "disputeCreateTime",
          defaultSortOrder: prefs.defaultSortOrder || "desc",
          columnsToDisplay: prefs.columnsToDisplay || [
            "disputeId",
            "status",
            "amount",
            "customer",
            "createTime",
            "account",
          ],
        })
      }
    } catch (error) {
      console.error("Error fetching preferences:", error)
      toast.error("Failed to load preferences")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Get current preferences and merge
      const response = await fetch("/api/settings/user-preferences")
      const data = await response.json()
      const currentPrefs = data.preferences || {}

      const updateResponse = await fetch("/api/settings/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...currentPrefs,
            ...preferences,
          },
        }),
      })

      if (!updateResponse.ok) {
        throw new Error("Failed to save preferences")
      }

      toast.success("Preferences saved successfully")
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const toggleColumn = (columnId: string) => {
    setPreferences((prev) => {
      const columns = prev.columnsToDisplay || []
      if (columns.includes(columnId)) {
        // Don't allow removing all columns
        if (columns.length > 1) {
          return {
            ...prev,
            columnsToDisplay: columns.filter((id) => id !== columnId),
          }
        }
        return prev
      } else {
        return {
          ...prev,
          columnsToDisplay: [...columns, columnId],
        }
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Preferences</CardTitle>
          <CardDescription>Customize your dashboard experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
        <CardDescription>Customize your dashboard experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="defaultStatusFilter">Default Status Filter</Label>
          <Select
            value={preferences.defaultStatusFilter}
            onValueChange={(value) =>
              setPreferences({ ...preferences, defaultStatusFilter: value })
            }
          >
            <SelectTrigger id="defaultStatusFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="WAITING_FOR_BUYER_RESPONSE">Waiting for Buyer</SelectItem>
              <SelectItem value="WAITING_FOR_SELLER_RESPONSE">Waiting for Seller</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultAccountFilter">Default Account Filter</Label>
          <Select
            value={preferences.defaultAccountFilter}
            onValueChange={(value) =>
              setPreferences({ ...preferences, defaultAccountFilter: value })
            }
          >
            <SelectTrigger id="defaultAccountFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {/* Account options will be loaded dynamically if needed */}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="rememberLastFilters">Remember Last Filters</Label>
            <p className="text-sm text-muted-foreground">
              Remember and restore your last used filters when returning to the dashboard
            </p>
          </div>
          <Switch
            id="rememberLastFilters"
            checked={preferences.rememberLastFilters}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, rememberLastFilters: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultSort">Default Sort By</Label>
          <Select
            value={preferences.defaultSort}
            onValueChange={(value) =>
              setPreferences({ ...preferences, defaultSort: value })
            }
          >
            <SelectTrigger id="defaultSort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disputeCreateTime">Created Date</SelectItem>
              <SelectItem value="disputeUpdateTime">Updated Date</SelectItem>
              <SelectItem value="disputeAmount">Amount</SelectItem>
              <SelectItem value="disputeStatus">Status</SelectItem>
              <SelectItem value="disputeId">Dispute ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultSortOrder">Default Sort Order</Label>
          <Select
            value={preferences.defaultSortOrder}
            onValueChange={(value) =>
              setPreferences({ ...preferences, defaultSortOrder: value })
            }
          >
            <SelectTrigger id="defaultSortOrder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending (Newest First)</SelectItem>
              <SelectItem value="asc">Ascending (Oldest First)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Columns to Display</Label>
          <p className="text-sm text-muted-foreground">
            Select which columns to show in the disputes table
          </p>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={preferences.columnsToDisplay.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <Label
                  htmlFor={column.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

