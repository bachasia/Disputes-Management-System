"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Save, Loader2, Key, TestTube, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface APIKeysData {
  openaiApiKey: string
  googleAiApiKey: string
  deepseekAiApiKey: string
}

interface TestResult {
  service: string
  success: boolean
  message: string
}

export function APIKeysSettings() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testResults, setTestResults] = React.useState<TestResult[]>([])
  const [apiKeys, setApiKeys] = React.useState<APIKeysData>({
    openaiApiKey: "",
    googleAiApiKey: "",
    deepseekAiApiKey: "",
  })

  React.useEffect(() => {
    if (isAdmin) {
      fetchAPIKeys()
    } else {
      setLoading(false)
    }
  }, [isAdmin])

  const fetchAPIKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/settings/api-keys")

      if (response.ok) {
        const data = await response.json()
        setApiKeys({
          openaiApiKey: data.openaiApiKey || "",
          googleAiApiKey: data.googleAiApiKey || "",
          deepseekAiApiKey: data.deepseekAiApiKey || "",
        })
      }
    } catch (error) {
      console.error("Error fetching API keys:", error)
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Only administrators can modify API keys")
      return
    }

    try {
      setSaving(true)

      const response = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKeys),
      })

      if (!response.ok) {
        throw new Error("Failed to save API keys")
      }

      toast.success("API keys saved successfully")
    } catch (error) {
      console.error("Error saving API keys:", error)
      toast.error("Failed to save API keys")
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnections = async () => {
    if (!isAdmin) {
      toast.error("Only administrators can test API connections")
      return
    }

    try {
      setTesting(true)
      setTestResults([])

      const response = await fetch("/api/settings/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKeys),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResults(data.results || [])
        
        const allSuccess = data.results?.every((r: TestResult) => r.success) || false
        if (allSuccess) {
          toast.success("All API connections tested successfully")
        } else {
          const failedCount = data.results?.filter((r: TestResult) => !r.success).length || 0
          toast.warning(`${failedCount} connection(s) failed. Check details below.`)
        }
      } else {
        throw new Error(data.error || "Failed to test connections")
      }
    } catch (error) {
      console.error("Error testing connections:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to test API connections"
      )
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage API keys for AI services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage API keys for AI services</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only administrators can view and manage API keys.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage API keys for AI services. Keys are encrypted and stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OpenAI API Key */}
        <div className="space-y-2">
          <Label htmlFor="openaiApiKey">
            OpenAI API Key
          </Label>
          <Input
            id="openaiApiKey"
            type="password"
            value={apiKeys.openaiApiKey}
            onChange={(e) =>
              setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })
            }
            placeholder="sk-..."
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Your OpenAI API key for GPT models
          </p>
        </div>

        {/* Google AI API Key */}
        <div className="space-y-2">
          <Label htmlFor="googleAiApiKey">
            Google AI API Key
          </Label>
          <Input
            id="googleAiApiKey"
            type="password"
            value={apiKeys.googleAiApiKey}
            onChange={(e) =>
              setApiKeys({ ...apiKeys, googleAiApiKey: e.target.value })
            }
            placeholder="AIza..."
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Your Google AI (Gemini) API key
          </p>
        </div>

        {/* Deepseek AI API Key */}
        <div className="space-y-2">
          <Label htmlFor="deepseekAiApiKey">
            Deepseek AI API Key
          </Label>
          <Input
            id="deepseekAiApiKey"
            type="password"
            value={apiKeys.deepseekAiApiKey}
            onChange={(e) =>
              setApiKeys({ ...apiKeys, deepseekAiApiKey: e.target.value })
            }
            placeholder="sk-..."
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Your Deepseek AI API key
          </p>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <Label>Test Results</Label>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <Alert
                  key={index}
                  variant={result.success ? "default" : "destructive"}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <strong>{result.service}:</strong> {result.message}
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={handleTestConnections}
            disabled={testing || !isAdmin}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Test Connections
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || !isAdmin}>
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


