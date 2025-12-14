"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface GeneralSettingsData {
  timezone: string
  dateFormat: string
  timeFormat: string
  itemsPerPage: number
  autoRefreshInterval: number
}

export function GeneralSettings() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<GeneralSettingsData>({
    timezone: "UTC",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "24h",
    itemsPerPage: 20,
    autoRefreshInterval: 0,
  })

  React.useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/settings")
      
      if (response.ok) {
        const data = await response.json()
        const systemSettings = data.settings || {}
        
        // Get user preferences for non-admin settings
        if (!isAdmin) {
          const prefResponse = await fetch("/api/settings/user-preferences")
          if (prefResponse.ok) {
            const prefData = await prefResponse.json()
            const prefs = prefData.preferences || {}
            setSettings({
              timezone: prefs.timezone || "UTC",
              dateFormat: prefs.dateFormat || "MM/dd/yyyy",
              timeFormat: prefs.timeFormat || "24h",
              itemsPerPage: prefs.itemsPerPage || 20,
              autoRefreshInterval: prefs.autoRefreshInterval || 0,
            })
            return
          }
        }

        setSettings({
          timezone: systemSettings.timezone || "UTC",
          dateFormat: systemSettings.dateFormat || "MM/dd/yyyy",
          timeFormat: systemSettings.timeFormat || "24h",
          itemsPerPage: parseInt(systemSettings.itemsPerPage || "20"),
          autoRefreshInterval: parseInt(systemSettings.autoRefreshInterval || "0"),
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      if (isAdmin) {
        // Save as system settings
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: {
              timezone: settings.timezone,
              dateFormat: settings.dateFormat,
              timeFormat: settings.timeFormat,
              itemsPerPage: String(settings.itemsPerPage),
              autoRefreshInterval: String(settings.autoRefreshInterval),
            },
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save settings")
        }
      } else {
        // Save as user preferences
        const prefResponse = await fetch("/api/settings/user-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: {
              ...settings,
            },
          }),
        })

        if (!prefResponse.ok) {
          throw new Error("Failed to save preferences")
        }
      }

      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure general application settings</CardDescription>
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
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Configure general application settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Default Timezone</Label>
          <Select
            value={settings.timezone}
            onValueChange={(value) => setSettings({ ...settings, timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
              <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
              <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (ICT)</SelectItem>
              <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select
            value={settings.dateFormat}
            onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
          >
            <SelectTrigger id="dateFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
              <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
              <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
              <SelectItem value="dd MMM yyyy">DD MMM YYYY</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeFormat">Time Format</Label>
          <Select
            value={settings.timeFormat}
            onValueChange={(value) => setSettings({ ...settings, timeFormat: value })}
          >
            <SelectTrigger id="timeFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24-hour (14:30)</SelectItem>
              <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="itemsPerPage">Items Per Page</Label>
          <Select
            value={String(settings.itemsPerPage)}
            onValueChange={(value) => setSettings({ ...settings, itemsPerPage: parseInt(value) })}
          >
            <SelectTrigger id="itemsPerPage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="autoRefreshInterval">Auto-refresh Interval (seconds)</Label>
          <Select
            value={String(settings.autoRefreshInterval)}
            onValueChange={(value) => setSettings({ ...settings, autoRefreshInterval: parseInt(value) })}
          >
            <SelectTrigger id="autoRefreshInterval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Off</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="600">10 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Automatically refresh data at the specified interval
          </p>
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

