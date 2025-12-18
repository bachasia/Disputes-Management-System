import { PayPalClient } from "./client"

/**
 * PayPal Tracking API Types
 * POST /v1/shipping/trackers
 */

export type TrackingStatus = "SHIPPED" | "ON_HOLD" | "DELIVERED" | "CANCELLED"

export interface TrackerItem {
  transaction_id: string
  tracking_number: string
  status: TrackingStatus
  carrier: string // YUNEXPRESS, FEDEX, UPS, etc.
  shipment_date?: string // ISO 8601 format
  carrier_name_other?: string // Used when carrier is "OTHER"
  tracking_url?: string // Optional tracking link
}

export interface AddTrackingRequest {
  trackers: TrackerItem[]
}

export interface TrackingError {
  name: string
  message: string
  details?: Array<{
    field: string
    value: string
    location: string
    issue: string
    description: string
  }>
}

export interface TrackerResponse {
  transaction_id: string
  tracking_number: string
  status: TrackingStatus
  carrier: string
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface AddTrackingResponse {
  tracker_identifiers: Array<{
    transaction_id: string
    tracking_number: string
  }>
  errors?: TrackingError[]
  links?: Array<{
    href: string
    rel: string
    method: string
  }>
}

/**
 * Common carrier codes supported by PayPal
 * Based on PayPal Dashboard screenshots
 */
export const CARRIER_CODES = {
  // Chinese/Asian carriers
  YUNEXPRESS: "YUNEXPRESS",
  CJPACKET: "CJPACKET",
  CAINIAO: "CAINIAO",
  CNEXPS: "CNEXPS",
  HRPARCEL: "HRPARCEL",
  CN_17POST: "CN_17POST",
  _2EBOX: "_2EBOX",
  TWO_GO: "TWO_GO",
  _360LION: "_360LION",
  YANWEN: "YANWEN",
  YDH: "YDH",
  
  // Standard carriers
  FEDEX: "FEDEX",
  UPS: "UPS",
  DHL: "DHL",
  USPS: "USPS",
  
  // Other
  OTHER: "OTHER",
} as const

export type CarrierCode = keyof typeof CARRIER_CODES | string

/**
 * Human-readable carrier names for UI
 */
export const CARRIER_DISPLAY_NAMES: Record<string, string> = {
  YUNEXPRESS: "YunExpress",
  CJPACKET: "CJ Packet",
  CAINIAO: "Cainiao",
  CNEXPS: "CNE Express",
  HRPARCEL: "HR Parcel",
  CN_17POST: "17Post",
  _2EBOX: "2eBox",
  TWO_GO: "2GO",
  _360LION: "360Lion",
  YANWEN: "Yanwen",
  YDH: "YDH Express",
  FEDEX: "FedEx",
  UPS: "UPS",
  DHL: "DHL",
  USPS: "USPS",
  OTHER: "Other",
}

/**
 * Tracking status display names
 */
export const TRACKING_STATUS_DISPLAY: Record<TrackingStatus, string> = {
  SHIPPED: "Shipped",
  ON_HOLD: "On Hold",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

/**
 * PayPal Tracking/Shipping API Client
 */
export class PayPalTrackingAPI {
  constructor(private client: PayPalClient) {}

  /**
   * Add tracking information to a transaction
   * POST /v1/shipping/trackers-batch (for batch)
   * POST /v1/shipping/trackers (for single)
   */
  async addTracking(
    transactionId: string,
    trackingNumber: string,
    carrier: string,
    status: TrackingStatus = "SHIPPED",
    options?: {
      shipmentDate?: string
      carrierNameOther?: string
      trackingUrl?: string
    }
  ): Promise<AddTrackingResponse> {
    const tracker: TrackerItem = {
      transaction_id: transactionId,
      tracking_number: trackingNumber,
      status,
      carrier,
    }

    if (options?.shipmentDate) {
      tracker.shipment_date = options.shipmentDate
    }

    if (options?.carrierNameOther) {
      tracker.carrier_name_other = options.carrierNameOther
    }

    if (options?.trackingUrl) {
      tracker.tracking_url = options.trackingUrl
    }

    const body: AddTrackingRequest = {
      trackers: [tracker],
    }

    return this.client.request<AddTrackingResponse>(
      "POST",
      "/v1/shipping/trackers-batch",
      body
    )
  }

  /**
   * Update existing tracking information
   * PUT /v1/shipping/trackers/{id}
   */
  async updateTracking(
    transactionId: string,
    trackingNumber: string,
    updates: Partial<{
      status: TrackingStatus
      carrier: string
      carrierNameOther: string
      trackingUrl: string
    }>
  ): Promise<TrackerResponse> {
    const trackerId = `${transactionId}-${trackingNumber}`
    
    const body: Partial<TrackerItem> = {}
    
    if (updates.status) {
      body.status = updates.status
    }
    if (updates.carrier) {
      body.carrier = updates.carrier
    }
    if (updates.carrierNameOther) {
      body.carrier_name_other = updates.carrierNameOther
    }
    if (updates.trackingUrl) {
      body.tracking_url = updates.trackingUrl
    }

    return this.client.request<TrackerResponse>(
      "PUT",
      `/v1/shipping/trackers/${trackerId}`,
      body
    )
  }

  /**
   * Get tracking information for a transaction
   * GET /v1/shipping/trackers/{id}
   */
  async getTracking(
    transactionId: string,
    trackingNumber: string
  ): Promise<TrackerResponse> {
    const trackerId = `${transactionId}-${trackingNumber}`
    
    return this.client.request<TrackerResponse>(
      "GET",
      `/v1/shipping/trackers/${trackerId}`
    )
  }
}

