import { PayPalClient, PayPalAPIError } from "./client"

/**
 * PayPal Disputes API Response Types
 */
export interface PayPalDispute {
  dispute_id: string
  create_time: string
  update_time: string
  // Amount is at root level, not in transactions
  dispute_amount?: {
    currency_code: string
    value: string
  }
  // PayPal API uses "disputed_transactions" not "transactions"
  disputed_transactions?: Array<{
    buyer_transaction_id?: string
    seller_transaction_id?: string
    create_time?: string
    transaction_status?: string
    invoice_number?: string
    gross_amount?: {
      currency_code: string
      value: string
    }
    buyer?: {
      name?: {
        given_name: string
        surname: string
      } | string
      email_address?: string
    }
    seller?: {
      email_address?: string
      merchant_id?: string
    }
  }>
  // Keep old "transactions" for backward compatibility
  transactions?: Array<{
    seller_transaction_id: string
    create_time: string
    transaction_status: string
    gross_amount: {
      currency_code: string
      value: string
    }
    buyer: {
      name: {
        given_name: string
        surname: string
      }
      email_address: string
    }
    seller: {
      email_address: string
      merchant_id: string
    }
  }>
  reason: string // Dispute reason (MERCHANDISE_OR_SERVICE_NOT_RECEIVED, etc.)
  status: string
  dispute_state: string
  dispute_life_cycle_stage: string // Dispute type/stage (INQUIRY, CHARGEBACK, PRE_ARBITRATION, etc.)
  dispute_channel: string
  dispute_category?: string // Dispute category (ITEM_NOT_RECEIVED, UNAUTHORIZED_TRANSACTION, etc.)
  outcome?: string
  messages?: Array<{
    posted_by: string
    time_posted: string
    content: string
    attachments?: Array<{
      name: string
      url: string
    }>
  }>
  offer?: {
    buyer_requested_amount?: {
      currency_code: string
      value: string
    }
    seller_offered_amount?: {
      currency_code: string
      value: string
    }
  }
  refund_details?: {
    allowed_refund_amount?: {
      currency_code: string
      value: string
    }
  }
  buyer_response_due_date?: string
  seller_response_due_date?: string
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface PayPalDisputesListResponse {
  items: PayPalDispute[]
  total_items: number
  total_pages: number
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface ListDisputesParams {
  start_time?: string // ISO 8601 format
  page_size?: number // 1-20, default 10 (PayPal Disputes API max is 20, not 100)
  dispute_state?: string // OPEN, WAITING_FOR_BUYER_RESPONSE, WAITING_FOR_SELLER_RESPONSE, UNDER_REVIEW, RESOLVED, OTHER
  // Note: PayPal API doesn't support 'page' parameter, use pagination links instead
}

// Accept claim reason types
export type AcceptClaimReason = 
  | "POLICY" 
  | "DID_NOT_SHIP" 
  | "TOO_TIME_CONSUMING" 
  | "CANNOT_PROVIDE_EVIDENCE"

// Display names for accept claim reasons
export const ACCEPT_CLAIM_REASON_DISPLAY: Record<AcceptClaimReason, string> = {
  POLICY: "Policy compliance",
  DID_NOT_SHIP: "Item was not shipped",
  TOO_TIME_CONSUMING: "Too time consuming to dispute",
  CANNOT_PROVIDE_EVIDENCE: "Cannot provide evidence",
}

export interface AcceptClaimRequest {
  note?: string
  accept_claim_reason?: AcceptClaimReason
  refund_amount?: {
    currency_code: string
    value: string
  }
  invoice_id?: string
}

export interface AcceptClaimResponse {
  dispute_id: string
  status: string
  update_time: string
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface EvidenceItem {
  evidence_type: string
  evidence_info?: {
    tracking_info?: Array<{
      carrier_name?: string
      tracking_number?: string
    }>
    refund_ids?: string[]
    notes?: string
  }
  // When uploading files, only 'name' is required (must match multipart filename)
  // When referencing existing docs, 'url' is used
  documents?: Array<{
    name: string
    url?: string
  }>
}

export interface ProvideEvidenceRequest {
  evidence: EvidenceItem[]
  note?: string
}

export interface ProvideEvidenceResponse {
  dispute_id: string
  status: string
  update_time: string
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface SendMessageRequest {
  message: string
  posted_by?: string
  attachments?: Array<{
    name: string
    url: string
  }>
}

export interface SendMessageResponse {
  dispute_id: string
  messages: Array<{
    posted_by: string
    time_posted: string
    content: string
    attachments?: Array<{
      name: string
      url: string
    }>
  }>
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

/**
 * PayPal Disputes API Client
 */
export class PayPalDisputesAPI {
  constructor(private client: PayPalClient) {}

  /**
   * List disputes
   * GET /v1/customer/disputes
   */
  async listDisputes(
    params?: ListDisputesParams
  ): Promise<PayPalDisputesListResponse> {
    const queryParams: Record<string, string> = {}

    if (params?.start_time) {
      queryParams.start_time = params.start_time
    }
    if (params?.page_size) {
      // PayPal Disputes API maximum page_size is 20 (not 100)
      const pageSize = Math.max(1, Math.min(20, params.page_size))
      queryParams.page_size = pageSize.toString()
    }
    if (params?.dispute_state) {
      queryParams.dispute_state = params.dispute_state
    }
    // Note: PayPal API doesn't support 'page' parameter
    // Use pagination links from response.links instead

    return this.client.request<PayPalDisputesListResponse>(
      "GET",
      "/v1/customer/disputes",
      queryParams
    )
  }

  /**
   * Get dispute details
   * GET /v1/customer/disputes/{id}
   */
  async getDispute(disputeId: string): Promise<PayPalDispute> {
    return this.client.request<PayPalDispute>(
      "GET",
      `/v1/customer/disputes/${disputeId}`
    )
  }

  /**
   * Accept claim for a dispute (Full Refund)
   * POST /v1/customer/disputes/{id}/accept-claim
   */
  async acceptClaim(
    disputeId: string,
    options?: {
      note?: string
      acceptClaimReason?: AcceptClaimReason
      refundAmount?: { currencyCode: string; value: string }
      invoiceId?: string
    }
  ): Promise<AcceptClaimResponse> {
    const body: AcceptClaimRequest = {}
    
    if (options?.note) {
      body.note = options.note
    }
    if (options?.acceptClaimReason) {
      body.accept_claim_reason = options.acceptClaimReason
    }
    if (options?.refundAmount) {
      body.refund_amount = {
        currency_code: options.refundAmount.currencyCode,
        value: options.refundAmount.value,
      }
    }
    if (options?.invoiceId) {
      body.invoice_id = options.invoiceId
    }

    return this.client.request<AcceptClaimResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/accept-claim`,
      body
    )
  }

  /**
   * Provide evidence for a dispute (JSON only, no files)
   * POST /v1/customer/disputes/{id}/provide-evidence
   */
  async provideEvidence(
    disputeId: string,
    evidence: EvidenceItem[],
    note?: string
  ): Promise<ProvideEvidenceResponse> {
    const body: ProvideEvidenceRequest = {
      evidence,
    }
    if (note) {
      body.note = note
    }

    return this.client.request<ProvideEvidenceResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/provide-evidence`,
      body
    )
  }

  /**
   * Provide evidence with file uploads for a dispute
   * POST /v1/customer/disputes/{id}/provide-evidence (multipart/form-data)
   * 
   * IMPORTANT: 
   * - Only call this API ONCE per dispute submission
   * - All documents must be listed in documents[] array of input JSON
   * - All file binaries must be attached in the same multipart request
   * - Filename in documents[].name MUST match filename in multipart parts
   */
  async provideEvidenceWithFiles(
    disputeId: string,
    evidence: EvidenceItem[],
    files: Array<{ buffer: Buffer; filename: string; contentType: string }>,
    note?: string
  ): Promise<ProvideEvidenceResponse> {
    const token = await this.client.getAccessToken()
    const baseURL = this.client["sandbox"]
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com"

    // Build multipart form data manually
    const boundary = `----FormBoundary${Date.now()}`
    const parts: Buffer[] = []

    // Validate that all evidence items have evidence_type
    if (evidence.length > 0) {
      for (const item of evidence) {
        if (!item.evidence_type) {
          throw new Error(`Evidence item missing required field: evidence_type. Item: ${JSON.stringify(item)}`)
        }
      }
    }

    // IMPORTANT: Add documents array to evidence with filenames matching multipart parts
    // Each evidence item should reference the uploaded files
    const evidenceWithDocs = evidence.map((item, index) => {
      // Ensure evidence_type is preserved
      if (!item.evidence_type) {
        throw new Error(`Evidence item at index ${index} is missing evidence_type`)
      }
      
      // If this is the first evidence item, attach all documents to it
      if (index === 0 && files.length > 0) {
        return {
          evidence_type: item.evidence_type, // Explicitly preserve evidence_type
          ...(item.evidence_info && { evidence_info: item.evidence_info }),
          documents: files.map(f => ({ name: f.filename })),
        }
      }
      return item
    })

    // If no evidence items but we have files, create one with documents
    const finalEvidence = evidenceWithDocs.length > 0 
      ? evidenceWithDocs 
      : files.length > 0 
        ? [{ 
            evidence_type: "OTHER",
            documents: files.map(f => ({ name: f.filename })),
          }]
        : []

    // Validate final evidence before sending
    for (const item of finalEvidence) {
      if (!item.evidence_type) {
        throw new Error(`Final evidence item missing evidence_type: ${JSON.stringify(item)}`)
      }
    }

    // Add input JSON part
    const inputData: ProvideEvidenceRequest = { evidence: finalEvidence }
    if (note) {
      inputData.note = note
    }

    console.log("[PayPal] Provide evidence input:", JSON.stringify(inputData, null, 2))
    console.log("[PayPal] Evidence items count:", finalEvidence.length)
    console.log("[PayPal] Each evidence item has evidence_type:", finalEvidence.every(item => item.evidence_type))
    
    // Serialize JSON compactly (no spaces) to avoid parsing issues
    const inputJson = JSON.stringify(inputData)
    console.log("[PayPal] Input JSON string length:", inputJson.length)
    console.log("[PayPal] Input JSON preview:", inputJson.substring(0, 200))

    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="input"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      inputJson +
      `\r\n`
    ))

    // Add ALL file parts in the SAME request
    // Filename MUST match documents[].name in the input JSON
    for (const file of files) {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="evidence_file"; filename="${file.filename}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`
      ))
      parts.push(file.buffer)
      parts.push(Buffer.from('\r\n'))
    }

    // Add closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    console.log(`[PayPal] Uploading ${files.length} files to provide-evidence API`)

    const response = await fetch(
      `${baseURL}/v1/customer/disputes/${disputeId}/provide-evidence`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("PayPal provide-evidence error:", errorData)
      throw new PayPalAPIError(
        errorData.message || "Failed to provide evidence",
        response.status,
        errorData
      )
    }

    return response.json()
  }

  /**
   * Send message for a dispute
   * POST /v1/customer/disputes/{id}/send-message
   */
  async sendMessage(
    disputeId: string,
    message: string,
    postedBy?: string,
    attachments?: Array<{ name: string; url: string }>
  ): Promise<SendMessageResponse> {
    const body: SendMessageRequest = {
      message,
    }
    if (postedBy) {
      body.posted_by = postedBy
    }
    if (attachments) {
      body.attachments = attachments
    }

    return this.client.request<SendMessageResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/send-message`,
      body
    )
  }
}


