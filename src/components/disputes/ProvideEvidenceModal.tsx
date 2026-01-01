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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CARRIER_CODES,
  CARRIER_DISPLAY_NAMES,
  TRACKING_STATUS_DISPLAY,
  TrackingStatus,
} from "@/lib/paypal/tracking"
import { Upload, X, FileText } from "lucide-react"

// Evidence types matching PayPal's supported types
const EVIDENCE_TYPES = {
  PROOF_OF_FULFILLMENT: "Provide Fulfilment Information",
  PROOF_OF_REFUND: "Refund Information",
  OTHER: "Any other information",
} as const

type EvidenceType = keyof typeof EVIDENCE_TYPES

// File upload constraints
const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB total
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/gif", "image/png", "application/pdf", "text/plain"]
const ALLOWED_EXTENSIONS = ".jpg,.jpeg,.gif,.png,.pdf,.txt"

// Note character limit
const MAX_NOTE_LENGTH = 2000

interface ProvideEvidenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disputeId: string
  transactionId?: string | null
  onSuccess: () => void
}

export function ProvideEvidenceModal({
  open,
  onOpenChange,
  disputeId,
  transactionId,
  onSuccess,
}: ProvideEvidenceModalProps) {
  const [evidenceType, setEvidenceType] = React.useState<EvidenceType>("PROOF_OF_FULFILLMENT")
  const [note, setNote] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [carrier, setCarrier] = React.useState("")
  const [carrierOther, setCarrierOther] = React.useState("")
  const [trackingStatus, setTrackingStatus] = React.useState<TrackingStatus>("SHIPPED")
  const [trackingUrl, setTrackingUrl] = React.useState("")
  const [refundId, setRefundId] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setEvidenceType("PROOF_OF_FULFILLMENT")
    setNote("")
    setTrackingNumber("")
    setCarrier("")
    setCarrierOther("")
    setTrackingStatus("SHIPPED")
    setTrackingUrl("")
    setRefundId("")
    setFiles([])
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const validateFiles = (newFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = []
    const valid: File[] = []

    const currentTotalSize = files.reduce((sum, f) => sum + f.size, 0)
    let newTotalSize = currentTotalSize

    for (const file of newFiles) {
      // Check file count
      if (files.length + valid.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`)
        break
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed: JPG, GIF, PNG, PDF, TXT`)
        continue
      }

      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum 10MB per file`)
        continue
      }

      // Check total size
      if (newTotalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`Total file size exceeds 50MB limit`)
        break
      }

      newTotalSize += file.size
      valid.push(file)
    }

    return { valid, errors }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const { valid, errors } = validateFiles(newFiles)

      if (errors.length > 0) {
        setError(errors.join(". "))
      } else {
        setError(null)
      }

      if (valid.length > 0) {
        setFiles(prev => [...prev, ...valid])
      }
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      const { valid, errors } = validateFiles(newFiles)

      if (errors.length > 0) {
        setError(errors.join(". "))
      } else {
        setError(null)
      }

      if (valid.length > 0) {
        setFiles(prev => [...prev, ...valid])
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_NOTE_LENGTH) {
      setNote(value)
    }
  }

  // Sanitize file names to remove special characters that PayPal may reject
  const sanitizeFileName = (filename: string): string => {
    return filename
      .replace(/#/g, '-')  // Replace # with -
      .replace(/[<>:"|?*\\\/]/g, '_')  // Replace invalid chars with _
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate: PROOF_OF_FULFILLMENT with files requires tracking info
      if (files.length > 0 && evidenceType === "PROOF_OF_FULFILLMENT") {
        if (!trackingNumber && !carrier) {
          setError(
            "Tracking information (carrier and tracking number) is required when providing fulfillment evidence with files. " +
            "Please either add tracking information or change evidence type to 'Any other information'."
          )
          setLoading(false)
          return
        }
      }

      // Step 1: If fulfillment info with tracking, call Add Tracking API first
      if (
        evidenceType === "PROOF_OF_FULFILLMENT" &&
        trackingNumber &&
        carrier &&
        transactionId
      ) {
        const trackingResponse = await fetch(`/api/disputes/${disputeId}/add-tracking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionId,
            trackingNumber,
            carrier: carrier === "OTHER" ? "OTHER" : carrier,
            status: trackingStatus,
            carrierNameOther: carrier === "OTHER" ? carrierOther : undefined,
            trackingUrl: trackingUrl || undefined,
          }),
        })

        if (!trackingResponse.ok) {
          const trackingError = await trackingResponse.json()
          console.warn("Tracking API warning:", trackingError)
          // Don't fail - continue with evidence submission even if tracking fails
          // PayPal may already have tracking or transaction may not support it
        }
      }

      // Step 2: Call Provide Evidence API
      // Use FormData if files are present
      if (files.length > 0) {
        const formData = new FormData()

        // Add evidence info
        const evidence: any[] = []

        // Build evidence item based on type
        let evidenceItem: any = {
          evidence_type: evidenceType,
        }

        // Build evidence_info object (only if has data)
        const evidenceInfo: any = {}

        // Add type-specific info
        if (evidenceType === "PROOF_OF_FULFILLMENT" && (trackingNumber || carrier)) {
          evidenceInfo.tracking_info = [
            {
              carrier_name: carrier === "OTHER" ? carrierOther : carrier || undefined,
              tracking_number: trackingNumber || undefined,
            },
          ]
        } else if (evidenceType === "PROOF_OF_REFUND" && refundId) {
          evidenceInfo.refund_ids = [refundId]
        }

        // CRITICAL FIX: Always add notes to evidence_info if present
        // PayPal API requires notes in evidence_info.notes, not at top level
        if (note) {
          evidenceInfo.notes = note
        }

        // Only include evidence_info if it has actual data
        // PayPal rejects empty evidence_info: {} with INVALID_EVIDENCE_FILE
        if (Object.keys(evidenceInfo).length > 0) {
          evidenceItem.evidence_info = evidenceInfo
        }

        // Add documents reference for uploaded files (with sanitized names)
        evidenceItem.documents = files.map(f => ({ name: sanitizeFileName(f.name) }))

        evidence.push(evidenceItem)

        // Add to FormData (NO top-level note - PayPal doesn't process it with files)
        formData.append("input", JSON.stringify({ evidence }))

        // Add files with sanitized names
        files.forEach((file) => {
          // Create new File with sanitized name
          const sanitizedFile = new File([file], sanitizeFileName(file.name), {
            type: file.type
          })
          formData.append("evidence_file", sanitizedFile)
        })

        const response = await fetch(`/api/disputes/${disputeId}/provide-evidence`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to provide evidence")
        }
      } else {
        // No files - use JSON
        const evidence: any[] = []

        if (evidenceType === "PROOF_OF_FULFILLMENT") {
          if (trackingNumber || carrier) {
            evidence.push({
              evidence_type: "PROOF_OF_FULFILLMENT",
              evidence_info: {
                tracking_info: [
                  {
                    carrier_name: carrier === "OTHER" ? carrierOther : carrier || undefined,
                    tracking_number: trackingNumber || undefined,
                  },
                ],
              },
            })
          }
        } else if (evidenceType === "PROOF_OF_REFUND") {
          if (refundId) {
            evidence.push({
              evidence_type: "PROOF_OF_REFUND",
              evidence_info: {
                refund_ids: [refundId],
              },
            })
          }
        } else {
          if (note) {
            evidence.push({
              evidence_type: "OTHER",
              evidence_info: {
                notes: note,
              },
            })
          }
        }

        if (evidence.length === 0 && note) {
          evidence.push({
            evidence_type: evidenceType,
            evidence_info: {
              notes: note,
            },
          })
        }

        if (evidence.length === 0) {
          setError("Please provide at least one piece of evidence")
          setLoading(false)
          return
        }

        const response = await fetch(`/api/disputes/${disputeId}/provide-evidence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evidence,
            note: note || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to provide evidence")
        }
      }

      onSuccess()
      handleClose(false)
    } catch (error) {
      console.error("Error providing evidence:", error)
      setError(error instanceof Error ? error.message : "Failed to provide evidence. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Get ordered carrier list
  const carrierList = Object.keys(CARRIER_CODES)

  // Calculate total file size
  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Evidence</DialogTitle>
          <DialogDescription>
            Submit evidence to support your case in this dispute.
            {!transactionId && (
              <span className="block mt-1 text-yellow-600">
                Note: Transaction ID not available. Tracking will be added to evidence only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Evidence Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="evidence-type">Evidence Type</Label>
              <Select
                value={evidenceType}
                onValueChange={(value) => setEvidenceType(value as EvidenceType)}
                disabled={loading}
              >
                <SelectTrigger id="evidence-type">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVIDENCE_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fulfilment Information Fields */}
            {evidenceType === "PROOF_OF_FULFILLMENT" && (
              <>
                {/* Carrier Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select
                    value={carrier}
                    onValueChange={setCarrier}
                    disabled={loading}
                  >
                    <SelectTrigger id="carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {carrierList.map((code) => (
                        <SelectItem key={code} value={code}>
                          {CARRIER_DISPLAY_NAMES[code] || code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Other Carrier Name (when OTHER is selected) */}
                {carrier === "OTHER" && (
                  <div className="space-y-2">
                    <Label htmlFor="carrier-other">Carrier Name</Label>
                    <Input
                      id="carrier-other"
                      value={carrierOther}
                      onChange={(e) => setCarrierOther(e.target.value)}
                      placeholder="Enter carrier name"
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Tracking Number */}
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

                {/* Tracking Status Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="tracking-status">Status of Shipment</Label>
                  <Select
                    value={trackingStatus}
                    onValueChange={(value) => setTrackingStatus(value as TrackingStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger id="tracking-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRACKING_STATUS_DISPLAY).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tracking URL (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="tracking-url">Add Tracking Link (Optional)</Label>
                  <Input
                    id="tracking-url"
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Refund Information Fields */}
            {evidenceType === "PROOF_OF_REFUND" && (
              <div className="space-y-2">
                <Label htmlFor="refund-id">Refund ID</Label>
                <Input
                  id="refund-id"
                  value={refundId}
                  onChange={(e) => setRefundId(e.target.value)}
                  placeholder="Enter PayPal refund ID"
                  disabled={loading}
                />
              </div>
            )}

            {/* File Upload Area */}
            <div className="space-y-2">
              <Label>Upload Evidence Files</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
                  } ${loading ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-primary font-medium">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG GIF PNG PDF TXT | Maximum of {MAX_FILES} files up to 10 MB each, 50 MB in total
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
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
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {files.length} file(s) selected • Total: {formatFileSize(totalFileSize)}
                  </p>
                </div>
              )}
            </div>

            {/* Note (for all types) */}
            <div className="space-y-2">
              <Label htmlFor="note">
                {evidenceType === "OTHER" ? "Evidence Details" : "Add more details (optional)"}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={handleNoteChange}
                placeholder={
                  evidenceType === "OTHER"
                    ? "Describe the evidence you are providing..."
                    : "Add any additional information..."
                }
                rows={4}
                disabled={loading}
                maxLength={MAX_NOTE_LENGTH}
              />
              <div className="text-xs text-muted-foreground text-right">
                {note.length}/{MAX_NOTE_LENGTH}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
