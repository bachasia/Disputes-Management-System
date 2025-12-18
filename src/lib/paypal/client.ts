import axios, { AxiosInstance, AxiosRequestConfig, Method } from "axios"
import CryptoJS from "crypto-js"
import FormData from "form-data"

export interface PayPalCredentials {
  clientId: string
  clientSecret: string
  environment: "sandbox" | "production"
}

export interface PayPalTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export class PayPalClient {
  private client: AxiosInstance
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly sandbox: boolean
  private readonly baseURL: string

  constructor(clientId: string, secretKey: string, sandbox: boolean = true) {
    this.clientId = clientId
    this.clientSecret = secretKey
    this.sandbox = sandbox
    this.baseURL = sandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com"

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  /**
   * Get OAuth access token from PayPal
   * Caches token until expiry
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    // Request new token
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    try {
      const response = await axios.post<PayPalTokenResponse>(
        `${this.baseURL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )

      this.accessToken = response.data.access_token
      const expiresIn = response.data.expires_in || 32400 // Default to 9 hours
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000)

      return this.accessToken
    } catch (error) {
      // Reset token on error
      this.accessToken = null
      this.tokenExpiry = null
      throw error
    }
  }

  /**
   * Generic request method with automatic authentication
   * @param method HTTP method
   * @param endpoint API endpoint (without base URL)
   * @param data Optional request body
   * @param config Optional axios config
   */
  async request<T = any>(
    method: Method,
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const token = await this.getAccessToken()

    // If endpoint is a full URL, extract path and query
    let url = endpoint
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      try {
        const urlObj = new URL(endpoint)
        url = urlObj.pathname + urlObj.search
      } catch {
        // If URL parsing fails, use endpoint as-is
      }
    }

    // Determine Content-Type: if data is FormData, let axios set it automatically
    const isFormData = data instanceof FormData
    const contentType = isFormData ? undefined : "application/json"

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(contentType && { "Content-Type": contentType }),
        ...config?.headers,
      },
      ...config,
    }

    // Remove Content-Type from headers if FormData (axios will set it with boundary)
    if (isFormData && requestConfig.headers) {
      delete (requestConfig.headers as any)["Content-Type"]
    }

    if (data) {
      if (method === "GET") {
        // For GET requests, use params (axios will handle query string)
        // If endpoint already has query params, we need to parse and merge
        if (url.includes("?")) {
          // Extract existing query params from URL
          try {
            const urlObj = new URL(url, this.baseURL)
            // Merge with new params
            Object.entries(data).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== "") {
                urlObj.searchParams.set(key, String(value))
              }
            })
            requestConfig.url = urlObj.pathname + urlObj.search
            // Don't set params if we're using URL search params
            requestConfig.params = undefined
          } catch (e) {
            // If URL parsing fails, fall back to axios params
            console.warn(`[PayPalClient] Failed to parse URL, using axios params:`, e)
            requestConfig.params = data
          }
        } else {
          // No existing query params, use axios params
          // Filter out undefined/null/empty values
          const filteredParams: Record<string, string> = {}
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              filteredParams[key] = String(value)
            }
          })
          requestConfig.params = filteredParams
        }
      } else {
        requestConfig.data = data
      }
    }

    // Debug logging
    console.log(`[PayPalClient] ${method} ${url}`, {
      hasParams: !!data,
      params: method === "GET" ? data : undefined,
    })

    try {
      const response = await this.client.request<T>(requestConfig)
      return response.data
    } catch (error: any) {
      // Handle PayPal API errors
      if (error.response) {
        console.error(`[PayPalClient] Error response:`, {
          status: error.response.status,
          data: JSON.stringify(error.response.data, null, 2),
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          fullUrl: `${this.baseURL}${error.config?.url}`,
        })
        
        // Log detailed error information
        if (error.response.data?.details) {
          console.error(`[PayPalClient] Error details:`, error.response.data.details)
        }
        
        throw new PayPalAPIError(
          error.response.data?.message || "PayPal API Error",
          error.response.status,
          error.response.data
        )
      }
      throw error
    }
  }

  /**
   * Make a multipart/form-data request to PayPal API
   * Uses form-data package for proper Node.js support
   */
  async requestMultipart<T = any>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const token = await this.getAccessToken()

    console.log(`[PayPalClient] POST ${endpoint} (multipart)`)

    try {
      const response = await axios.post<T>(
        `${this.baseURL}${endpoint}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data
    } catch (error: any) {
      if (error.response) {
        console.error(`[PayPalClient] Multipart Error response:`, {
          status: error.response.status,
          data: JSON.stringify(error.response.data, null, 2),
          url: endpoint,
        })

        if (error.response.data?.details) {
          console.error(`[PayPalClient] Error details:`, error.response.data.details)
        }

        throw new PayPalAPIError(
          error.response.data?.message || "PayPal API Error",
          error.response.status,
          error.response.data
        )
      }
      throw error
    }
  }
}

/**
 * Custom error class for PayPal API errors
 */
export class PayPalAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = "PayPalAPIError"
  }
}

/**
 * Decrypt PayPal credentials
 */
export function decryptCredentials(
  encryptedClientId: string,
  encryptedClientSecret: string,
  encryptionKey: string
): PayPalCredentials {
  const clientId = CryptoJS.AES.decrypt(encryptedClientId, encryptionKey).toString(
    CryptoJS.enc.Utf8
  )
  const clientSecret = CryptoJS.AES.decrypt(
    encryptedClientSecret,
    encryptionKey
  ).toString(CryptoJS.enc.Utf8)

  return {
    clientId,
    clientSecret,
    environment: "sandbox", // This should be stored in the database
  }
}

/**
 * Encrypt PayPal credentials
 */
export function encryptCredentials(
  clientId: string,
  clientSecret: string,
  encryptionKey: string
): { encryptedClientId: string; encryptedClientSecret: string } {
  return {
    encryptedClientId: CryptoJS.AES.encrypt(clientId, encryptionKey).toString(),
    encryptedClientSecret: CryptoJS.AES.encrypt(clientSecret, encryptionKey).toString(),
  }
}
