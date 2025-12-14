"use client"

import * as React from "react"
import { Settings as SettingsIcon, Globe, RefreshCw, Key, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { SyncSettings } from "@/components/settings/SyncSettings"
import { APIKeysSettings } from "@/components/settings/APIKeysSettings"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [activeTab, setActiveTab] = React.useState("general")

  // Debug: Log session and admin status
  React.useEffect(() => {
    console.log("[Settings] Session status:", status)
    console.log("[Settings] User role:", session?.user?.role)
    console.log("[Settings] Is admin:", isAdmin)
  }, [session, status, isAdmin])

  // Reset to general tab if user is not admin and trying to access api-keys
  React.useEffect(() => {
    if (status !== "loading" && !isAdmin && activeTab === "api-keys") {
      setActiveTab("general")
    }
  }, [isAdmin, activeTab, status])

  // Wait for session to load
  if (status === "loading") {
    return (
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your application settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <SyncSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="api-keys" className="space-y-4">
            <APIKeysSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

