import { PayPalClient } from "../src/lib/paypal/client"
import { decrypt } from "../src/lib/utils/encryption"
import { PrismaClient } from "@prisma/client"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

async function testPayPalCredentials(accountId?: string) {
  try {
    console.log("🔍 Testing PayPal Credentials...\n")

    // Get account from database
    let account
    if (accountId) {
      account = await prisma.payPalAccount.findUnique({
        where: { id: accountId },
      })
      if (!account) {
        console.error(`❌ Account not found: ${accountId}`)
        return
      }
    } else {
      // Get first active account
      account = await prisma.payPalAccount.findFirst({
        where: { active: true },
      })
      if (!account) {
        console.error("❌ No active PayPal account found")
        return
      }
    }

    console.log(`📋 Testing account: ${account.accountName}`)
    console.log(`   Email: ${account.email}`)
    console.log(`   Sandbox: ${account.sandboxMode ? "Yes" : "No"}`)
    console.log(`   Active: ${account.active ? "Yes" : "No"}\n`)

    // Decrypt credentials
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
      console.error("❌ ENCRYPTION_KEY not found in .env.local")
      return
    }

    let clientId: string
    let secretKey: string

    try {
      clientId = decrypt(account.clientId)
      secretKey = decrypt(account.secretKey)
      console.log("✅ Credentials decrypted successfully")
      console.log(`   Client ID: ${clientId.substring(0, 10)}...`)
      console.log(`   Secret Key: ${secretKey.substring(0, 10)}...\n`)
    } catch (error) {
      console.error("❌ Failed to decrypt credentials:", error)
      return
    }

    // Test OAuth token
    console.log("🔐 Testing OAuth token...")
    const paypalClient = new PayPalClient(
      clientId,
      secretKey,
      account.sandboxMode
    )

    try {
      const token = await paypalClient.getAccessToken()
      console.log("✅ OAuth token obtained successfully")
      console.log(`   Token: ${token.substring(0, 20)}...\n`)
    } catch (error: any) {
      console.error("❌ Failed to get OAuth token")
      if (error.response) {
        console.error(`   Status: ${error.response.status}`)
        console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`)
      } else {
        console.error(`   Error: ${error.message}`)
      }
      return
    }

    // Test Disputes API
    console.log("📊 Testing Disputes API...")
    try {
      const { PayPalDisputesAPI } = await import("../src/lib/paypal/disputes")
      const disputesAPI = new PayPalDisputesAPI(paypalClient)

      // Try to list disputes (with small page size)
      const response = await disputesAPI.listDisputes({
        page_size: 1,
      })

      console.log("✅ Disputes API accessible")
      console.log(`   Total items: ${response.total_items || 0}`)
      console.log(`   Items in response: ${response.items?.length || 0}`)
      console.log(`   Total pages: ${response.total_pages || 0}\n`)

      if (response.items && response.items.length > 0) {
        console.log("📝 Sample dispute:")
        const dispute = response.items[0]
        console.log(`   Dispute ID: ${dispute.dispute_id}`)
        console.log(`   Status: ${dispute.status || dispute.dispute_state}`)
        console.log(`   Reason: ${dispute.reason}`)
        console.log(`   Created: ${dispute.create_time}`)
      }
    } catch (error: any) {
      console.error("❌ Failed to access Disputes API")
      if (error.response) {
        console.error(`   Status: ${error.response.status}`)
        console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`)
      } else if (error.details) {
        console.error(`   Error: ${error.message}`)
        console.error(`   Details: ${JSON.stringify(error.details, null, 2)}`)
      } else {
        console.error(`   Error: ${error.message}`)
      }
      return
    }

    console.log("\n🎉 All tests passed! Credentials are valid.")
  } catch (error) {
    console.error("❌ Test failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get account ID from command line args
const accountId = process.argv[2]

testPayPalCredentials(accountId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })


