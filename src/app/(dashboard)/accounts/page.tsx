"use client"

import * as React from "react"
import { Plus, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { AccountCard } from "@/components/accounts/AccountCard"
import { AccountFormModal } from "@/components/accounts/AccountFormModal"
import { DeleteConfirmDialog } from "@/components/accounts/DeleteConfirmDialog"
import { toast } from "sonner"

interface Account {
  id: string
  account_name: string
  email: string
  active: boolean
  sandbox_mode: boolean
  last_sync_at: string | null
  disputes_count: number
}

export default function AccountsPage() {
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "viewer"
  const isAdmin = session?.user?.role === "admin"
  const canManageAccounts = isAdmin // Only admin can manage PayPal accounts
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(true)
  const [formModalOpen, setFormModalOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null)
  const [syncLoading, setSyncLoading] = React.useState<string | null>(null)
  const [testingAccount, setTestingAccount] = React.useState<string | null>(null)

  // Fetch accounts
  const fetchAccounts = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/accounts")
      if (!response.ok) {
        throw new Error("Failed to fetch accounts")
      }
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Handle add account
  const handleAddAccount = async (formData: any) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_name: formData.account_name,
          email: formData.email,
          client_id: formData.client_id,
          secret_key: formData.secret_key,
          sandbox_mode: formData.sandbox_mode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create account")
      }

      await fetchAccounts()
    } catch (error) {
      console.error("Error adding account:", error)
      throw error
    }
  }

  // Handle edit account
  const handleEditAccount = async (formData: any) => {
    if (!selectedAccount) return

    try {
      const updateData: any = {
        account_name: formData.account_name,
        email: formData.email,
        sandbox_mode: formData.sandbox_mode,
      }

      // Only include credentials if provided
      if (formData.client_id) {
        updateData.client_id = formData.client_id
      }
      if (formData.secret_key) {
        updateData.secret_key = formData.secret_key
      }

      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update account")
      }

      await fetchAccounts()
    } catch (error) {
      console.error("Error updating account:", error)
      throw error
    }
  }

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!selectedAccount) return

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      await fetchAccounts()
    } catch (error) {
      console.error("Error deleting account:", error)
      throw error
    }
  }

  // Handle sync account
  const handleSyncAccount = async (accountId: string, syncType: "incremental" | "90days" | "full" = "incremental") => {
    setSyncLoading(accountId)
    try {
      const response = await fetch("/api/disputes/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account_id: accountId, syncType }),
      })

      if (!response.ok) {
        throw new Error("Failed to sync account")
      }

      // Refresh accounts to update last_sync_at
      await fetchAccounts()
      toast.success("Account synced successfully!")
    } catch (error) {
      console.error("Error syncing account:", error)
      toast.error("Failed to sync account. Please try again.")
    } finally {
      setSyncLoading(null)
    }
  }

  // Handle test credentials
  const handleTestCredentials = async (accountId: string) => {
    setTestingAccount(accountId)
    try {
      const response = await fetch("/api/test/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("✅ Credentials are valid!", {
          description: "All tests passed successfully.",
        })
      } else {
        // Show detailed error
        const failedSteps = data.results
          .filter((r: any) => !r.success)
          .map((r: any) => r.step)
          .join(", ")

        toast.error("❌ Credentials test failed", {
          description: `Failed steps: ${failedSteps}. Check console for details.`,
        })

        // Log detailed results
        console.log("Test Results:", data.results)
      }
    } catch (error) {
      console.error("Error testing credentials:", error)
      toast.error("Failed to test credentials. Please try again.")
    } finally {
      setTestingAccount(null)
    }
  }

  const handleOpenEdit = (account: Account) => {
    setSelectedAccount(account)
    setFormModalOpen(true)
  }

  const handleOpenDelete = (account: Account) => {
    setSelectedAccount(account)
    setDeleteDialogOpen(true)
  }

  const handleFormSubmit = async (formData: any) => {
    if (selectedAccount) {
      await handleEditAccount(formData)
    } else {
      await handleAddAccount(formData)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PayPal Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your PayPal accounts and sync disputes
          </p>
        </div>
        {canManageAccounts && (
          <Button
            onClick={() => {
              setSelectedAccount(null)
              setFormModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add PayPal Account
          </Button>
        )}
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No PayPal accounts found</p>
          {canManageAccounts && (
            <Button
              onClick={() => {
                setSelectedAccount(null)
                setFormModalOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onSync={handleSyncAccount}
              onTest={handleTestCredentials}
              testing={testingAccount === account.id}
              syncing={syncLoading === account.id}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AccountFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSubmit={handleFormSubmit}
        account={selectedAccount || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteAccount}
        accountName={selectedAccount?.account_name}
      />
    </div>
  )
}
