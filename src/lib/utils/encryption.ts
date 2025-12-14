import CryptoJS from "crypto-js"

/**
 * Get encryption key from environment variables
 * Throws error if key is not set
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY is not set in environment variables. Please set it in .env.local"
    )
  }

  if (key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY must be at least 32 characters long for security"
    )
  }

  return key
}

/**
 * Encrypt text using AES encryption
 * @param text - Plain text to encrypt
 * @returns Encrypted string (base64 encoded)
 * @throws Error if encryption fails or ENCRYPTION_KEY is not set
 */
export function encrypt(text: string): string {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text to encrypt must be a non-empty string")
    }

    const key = getEncryptionKey()
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()

    return encrypted
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
    throw new Error("Encryption failed: Unknown error")
  }
}

/**
 * Decrypt encrypted text using AES decryption
 * @param encryptedText - Encrypted string (base64 encoded)
 * @returns Decrypted original string
 * @throws Error if decryption fails, ENCRYPTION_KEY is not set, or text is invalid
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText || typeof encryptedText !== "string") {
      throw new Error("Encrypted text must be a non-empty string")
    }

    const key = getEncryptionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key)

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedText) {
      throw new Error(
        "Decryption failed: Invalid encrypted text or wrong encryption key"
      )
    }

    return decryptedText
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
    throw new Error("Decryption failed: Unknown error")
  }
}


