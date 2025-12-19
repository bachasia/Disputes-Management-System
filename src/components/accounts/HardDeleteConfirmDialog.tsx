"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface HardDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  accountName?: string
  disputesCount?: number
}

export function HardDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  accountName,
  disputesCount = 0,
}: HardDeleteConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting account:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete PayPal Account Permanently
          </DialogTitle>
          <DialogDescription className="pt-2">
            <div className="space-y-2">
              <p>
                Are you sure you want to <strong className="text-destructive">permanently delete</strong>{" "}
                <span className="font-semibold">{accountName || "this account"}</span>?
              </p>
              {disputesCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  This will also delete <strong>{disputesCount}</strong> associated dispute{disputesCount !== 1 ? "s" : ""} permanently.
                </p>
              )}
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone!
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
