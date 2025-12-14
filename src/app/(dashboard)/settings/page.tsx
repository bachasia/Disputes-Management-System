"use client"

import * as React from "react"
import { Settings as SettingsIcon, Globe, RefreshCw, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { SyncSettings } from "@/components/settings/SyncSettings"
import { UserPreferences } from "@/components/settings/UserPreferences"

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <SyncSettings />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <UserPreferences />
        </TabsContent>
      </Tabs>
    </div>
  )
}

