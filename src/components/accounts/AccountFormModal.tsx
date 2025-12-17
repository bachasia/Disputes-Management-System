"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface AccountFormData {
  account_name: string
  email: string
  client_id: string
  secret_key: string
  sandbox_mode: boolean
}

interface AccountFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AccountFormData) => Promise<void>
  account?: any // For edit mode
}

export function AccountFormModal({
  open,
  onOpenChange,
  onSubmit,
  account,
}: AccountFormModalProps) {
  const [formData, setFormData] = React.useState<AccountFormData>({
    account_name: "",
    email: "",
    client_id: "",
    secret_key: "",
    sandbox_mode: true,
  })
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name || "",
        email: account.email || "",
        client_id: "", // Don't pre-fill credentials
        secret_key: "", // Don't pre-fill credentials
        sandbox_mode: account.sandbox_mode ?? true,
      })
    } else {
      setFormData({
        account_name: "",
        email: "",
        client_id: "",
        secret_key: "",
        sandbox_mode: true,
      })
    }
    setErrors({})
  }, [account, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.account_name.trim()) {
      newErrors.account_name = "Account name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!account && !formData.client_id.trim()) {
      newErrors.client_id = "Client ID is required"
    }

    if (!account && !formData.secret_key.trim()) {
      newErrors.secret_key = "Secret key is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit PayPal Account" : "Add PayPal Account"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Update your PayPal account information. Leave credentials empty to keep existing values."
              : "Add a new PayPal account to start syncing disputes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_name: e.target.value })
                }
                placeholder="My PayPal Account"
                disabled={loading}
              />
              {errors.account_name && (
                <p className="text-sm text-destructive">{errors.account_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">PayPal Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="merchant@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                placeholder={account ? "Leave empty to keep existing" : "Your PayPal Client ID"}
                disabled={loading}
              />
              {errors.client_id && (
                <p className="text-sm text-destructive">{errors.client_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret_key">Secret Key</Label>
              <Input
                id="secret_key"
                type="password"
                value={formData.secret_key}
                onChange={(e) =>
                  setFormData({ ...formData, secret_key: e.target.value })
                }
                placeholder={account ? "Leave empty to keep existing" : "Your PayPal Secret Key"}
                disabled={loading}
              />
              {errors.secret_key && (
                <p className="text-sm text-destructive">{errors.secret_key}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sandbox_mode"
                checked={formData.sandbox_mode}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sandbox_mode: checked === true })
                }
                disabled={loading}
              />
              <Label
                htmlFor="sandbox_mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Sandbox Mode
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : account ? "Update" : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



