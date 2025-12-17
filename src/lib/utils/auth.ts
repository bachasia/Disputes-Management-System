/**
 * Get the base URL without port for production
 * This ensures redirects don't include port numbers
 */
export function getBaseUrl(): string {
  // Server-side: use NEXTAUTH_URL if available
  if (typeof window === 'undefined' && process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL)
      // For production (https or non-localhost), remove port
      if (url.port && (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1'))) {
        return `${url.protocol}//${url.hostname}`
      }
      return process.env.NEXTAUTH_URL
    } catch {
      // If NEXTAUTH_URL is invalid, continue to fallback
    }
  }
  
  // Client-side: use current origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    try {
      const url = new URL(origin)
      // Remove port for production domains (non-localhost)
      if (url.port && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return `${url.protocol}//${url.hostname}`
      }
      return origin
    } catch {
      return origin
    }
  }
  
  // Server-side fallback
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

/**
 * Get login URL without port
 */
export function getLoginUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/login`
}

