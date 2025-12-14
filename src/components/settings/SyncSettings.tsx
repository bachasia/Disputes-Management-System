"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Save, Loader2, AlertCircle, Play } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SyncSettingsData {
  autoSyncEnabled: boolean
  syncFrequency: string
  syncTime: string
  syncAllAccounts: boolean
  syncOnStartup: boolean
  syncFailureAlerts: boolean
  syncType: "incremental" | "90days" | "full"
}

export function SyncSettings() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [settings, setSettings] = React.useState<SyncSettingsData>({
    autoSyncEnabled: false,
    syncFrequency: "30",
    syncTime: "00:00",
    syncAllAccounts: true,
    syncOnStartup: false,
    syncFailureAlerts: true,
    syncType: "incremental",
  })

  React.useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/settings/sync")

      if (response.ok) {
        const data = await response.json()
        setSettings({
          autoSyncEnabled: data.autoSyncEnabled || false,
          syncFrequency: data.syncFrequency || "30",
          syncTime: data.syncTime || "00:00",
          syncAllAccounts: data.syncAllAccounts !== false,
          syncOnStartup: data.syncOnStartup || false,
          syncFailureAlerts: data.syncFailureAlerts !== false,
          syncType: data.syncType || "incremental",
        })
      }
    } catch (error) {
      console.error("Error fetching sync settings:", error)
      toast.error("Failed to load sync settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Only administrators can modify sync settings")
      return
    }

    try {
      setSaving(true)

      const response = await fetch("/api/settings/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error("Failed to save sync settings")
      }

      toast.success("Sync settings saved successfully")
    } catch (error) {
      console.error("Error saving sync settings:", error)
      toast.error("Failed to save sync settings")
    } finally {
      setSaving(false)
    }
  }

  const handleTestSync = async () => {
    if (!isAdmin) {
      toast.error("Only administrators can test auto sync")
      return
    }

    if (!settings.autoSyncEnabled) {
      toast.error("Please enable auto sync first")
      return
    }

    try {
      setTesting(true)

      const response = await fetch("/api/cron/sync/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to test auto sync")
      }

      if (data.success) {
        toast.success(data.message || "Auto sync test completed successfully")
      } else {
        toast.warning(data.message || "Auto sync test completed with warnings")
      }
    } catch (error) {
      console.error("Error testing auto sync:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to test auto sync. Please check if you're logged in."
      )
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Configure automatic synchronization settings</CardDescription>
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
        <CardTitle>Sync Settings</CardTitle>
        <CardDescription>Configure automatic synchronization settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only administrators can modify sync settings. You can view the current settings below.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoSyncEnabled">Auto Sync Enabled</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync disputes from PayPal accounts
            </p>
          </div>
          <Switch
            id="autoSyncEnabled"
            checked={settings.autoSyncEnabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, autoSyncEnabled: checked })
            }
            disabled={!isAdmin}
          />
        </div>

        {settings.autoSyncEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Sync Frequency</Label>
              <Select
                value={settings.syncFrequency}
                onValueChange={(value) =>
                  setSettings({ ...settings, syncFrequency: value })
                }
                disabled={!isAdmin}
              >
                <SelectTrigger id="syncFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every 1 hour</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.syncFrequency === "1440" && (
              <div className="space-y-2">
                <Label htmlFor="syncTime">Sync Time</Label>
                <Input
                  id="syncTime"
                  type="time"
                  value={settings.syncTime}
                  onChange={(e) =>
                    setSettings({ ...settings, syncTime: e.target.value })
                  }
                  disabled={!isAdmin}
                />
                <p className="text-sm text-muted-foreground">
                  Time of day to perform daily sync (24-hour format)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="syncType">Auto Sync Type</Label>
              <Select
                value={settings.syncType}
                onValueChange={(value: "incremental" | "90days" | "full") =>
                  setSettings({ ...settings, syncType: value })
                }
                disabled={!isAdmin}
              >
                <SelectTrigger id="syncType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">Incremental Sync</SelectItem>
                  <SelectItem value="90days">Sync Last 90 Days</SelectItem>
                  <SelectItem value="full">Full Sync</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Type of sync to perform automatically
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="syncAllAccounts">Sync All Accounts</Label>
                <p className="text-sm text-muted-foreground">
                  Sync all active PayPal accounts, or only selected accounts
                </p>
              </div>
              <Switch
                id="syncAllAccounts"
                checked={settings.syncAllAccounts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, syncAllAccounts: checked })
                }
                disabled={!isAdmin}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="syncOnStartup">Sync on Startup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync when the application starts
                </p>
              </div>
              <Switch
                id="syncOnStartup"
                checked={settings.syncOnStartup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, syncOnStartup: checked })
                }
                disabled={!isAdmin}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="syncFailureAlerts">Sync Failure Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications when sync operations fail
            </p>
          </div>
          <Switch
            id="syncFailureAlerts"
            checked={settings.syncFailureAlerts}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, syncFailureAlerts: checked })
            }
            disabled={!isAdmin}
          />
        </div>

        {isAdmin && (
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              onClick={handleTestSync}
              disabled={testing || !settings.autoSyncEnabled}
              variant="outline"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Auto Sync
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
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
        )}
      </CardContent>
    </Card>
  )
}

