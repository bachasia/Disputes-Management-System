"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { FileText, X } from "lucide-react"

interface ProvideEvidenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  onSuccess: () => void
}

export function ProvideEvidenceModal({
  open,
  onOpenChange,
  disputeId,
  onSuccess,
}: ProvideEvidenceModalProps) {
  const [note, setNote] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [carrierName, setCarrierName] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [loading, setLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate: need either tracking info or files
      if (!trackingNumber && !carrierName && files.length === 0) {
        alert("Please provide at least one piece of evidence (tracking info or documents)")
        setLoading(false)
        return
      }

      // Create FormData for multipart/form-data
      const formData = new FormData()

      // Add files if any
      files.forEach((file) => {
        formData.append("evidence-file", file)
      })

      // Add tracking info and note as JSON if provided
      const evidenceData: any = {}
      
      if (trackingNumber || carrierName) {
        evidenceData.evidence = [
          {
            evidence_type: "PROOF_OF_FULFILLMENT",
            evidence_info: {
              tracking_info: [
                {
                  carrier_name: carrierName || undefined,
                  tracking_number: trackingNumber || undefined,
                },
              ],
            },
          },
        ]
      }

      if (note) {
        evidenceData.note = note
      }

      // If we have evidence data (tracking or note), add it as JSON
      if (Object.keys(evidenceData).length > 0) {
        formData.append("evidence", JSON.stringify(evidenceData))
      }

      const response = await fetch(`/api/disputes/${disputeId}/provide-evidence`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to provide evidence")
      }

      onSuccess()
      onOpenChange(false)
      setNote("")
      setTrackingNumber("")
      setCarrierName("")
      setFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error providing evidence:", error)
      alert(error instanceof Error ? error.message : "Failed to provide evidence. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Provide Evidence</DialogTitle>
          <DialogDescription>
            Submit evidence to support your case in this dispute.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier Name</Label>
              <Input
                id="carrier"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="e.g., UPS, FedEx, DHL"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add additional information..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Documents (Optional)</Label>
              <div className="space-y-2">
                <Input
                  id="files"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  disabled={loading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, JPG, PNG, DOC, DOCX
                </p>
                {files.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={loading}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              {loading ? "Submitting..." : "Submit Evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



