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
  documents?: Array<{
    name: string
    url: string
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

export interface MakeOfferRequest {
  note: string
  offer_type: "REFUND" | "REFUND_WITH_RETURN" | "REFUND_WITH_REPLACEMENT" | "REPLACEMENT_WITHOUT_REFUND"
  offer_amount: {
    currency_code: string
    value: string
  }
  return_shipping_address?: {
    country_code: string
    address_line_1?: string
    address_line_2?: string
    address_line_3?: string
    admin_area_4?: string
    admin_area_3?: string
    admin_area_2?: string
    admin_area_1?: string
    postal_code?: string
    address_details?: {
      street_number?: string
      street_name?: string
      street_type?: string
      delivery_service?: string
      building_name?: string
      sub_building?: string
    }
  }
  invoice_id?: string
}

export interface MakeOfferResponse {
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
   * Accept claim for a dispute
   * POST /v1/customer/disputes/{id}/accept-claim
   * According to PayPal docs: https://docs.paypal.ai/reference/api/rest/disputes-actions/accept-claim
   * Uses multipart/form-data with optional accept-claim-document file
   */
  async acceptClaim(
    disputeId: string,
    file?: File | Blob
  ): Promise<AcceptClaimResponse> {
    // According to PayPal docs, accept-claim uses multipart/form-data
    // with optional accept-claim-document file
    if (file) {
      const formData = new FormData()
      formData.append("accept-claim-document", file)

      return this.client.request<AcceptClaimResponse>(
        "POST",
        `/v1/customer/disputes/${disputeId}/accept-claim`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
    } else {
      // If no file, send empty FormData
      const formData = new FormData()
      return this.client.request<AcceptClaimResponse>(
        "POST",
        `/v1/customer/disputes/${disputeId}/accept-claim`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
    }
  }

  /**
   * Provide evidence for a dispute
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
   * Provide evidence with file upload (multipart/form-data)
   * POST /v1/customer/disputes/{id}/provide-evidence
   * According to PayPal docs: https://docs.paypal.ai/reference/api/rest/disputes-actions/provide-evidence
   */
  async provideEvidenceWithFile(
    disputeId: string,
    file: File | Blob
  ): Promise<ProvideEvidenceResponse> {
    // Create FormData for multipart/form-data
    const formData = new FormData()
    formData.append("evidence-file", file)

    return this.client.request<ProvideEvidenceResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/provide-evidence`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
  }

  /**
   * Send message for a dispute
   * POST /v1/customer/disputes/{id}/send-message
   * According to PayPal docs: https://docs.paypal.ai/reference/api/rest/disputes-actions/send-message-about-dispute-to-other-party
   * Uses multipart/form-data with optional message_document file
   * Note: Only works when dispute_life_cycle_stage is INQUIRY
   */
  async sendMessage(
    disputeId: string,
    file?: File | Blob
  ): Promise<SendMessageResponse> {
    // According to PayPal docs, send-message uses multipart/form-data
    // with optional message_document file
    const formData = new FormData()
    
    if (file) {
      formData.append("message_document", file)
    }

    return this.client.request<SendMessageResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/send-message`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
  }

  /**
   * Make offer to resolve dispute
   * POST /v1/customer/disputes/{id}/make-offer
   * According to PayPal docs: https://docs.paypal.ai/reference/api/rest/disputes-actions/make-offer-to-resolve-dispute
   * Note: Only works when dispute stage is INQUIRY
   */
  async makeOffer(
    disputeId: string,
    offer: MakeOfferRequest
  ): Promise<MakeOfferResponse> {
    return this.client.request<MakeOfferResponse>(
      "POST",
      `/v1/customer/disputes/${disputeId}/make-offer`,
      offer
    )
  }
}


