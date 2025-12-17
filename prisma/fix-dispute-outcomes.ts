import { PrismaClient } from "@prisma/client"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

/**
 * Script to fix dispute outcomes that were incorrectly set to "RESOLVED" or "CLOSED"
 * This script extracts the actual outcome from rawData and updates the dispute
 */
async function main() {
  console.log("🔧 Starting dispute outcome fix...")

  // Find all resolved disputes with outcome = "RESOLVED" or "CLOSED" or null
  const disputes = await prisma.dispute.findMany({
    where: {
      OR: [
        { disputeStatus: "RESOLVED" },
        { disputeStatus: "CLOSED" },
        { resolvedAt: { not: null } },
      ],
    },
    select: {
      id: true,
      disputeId: true,
      disputeStatus: true,
      disputeOutcome: true,
      rawData: true,
    },
  })

  console.log(`📊 Found ${disputes.length} resolved disputes to check`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const dispute of disputes) {
    try {
      // Skip if outcome is already valid (not "RESOLVED" or "CLOSED")
      if (
        dispute.disputeOutcome &&
        dispute.disputeOutcome.toUpperCase() !== "RESOLVED" &&
        dispute.disputeOutcome.toUpperCase() !== "CLOSED"
      ) {
        console.log(
          `✓ Dispute ${dispute.disputeId} already has valid outcome: "${dispute.disputeOutcome}"`
        )
        skipped++
        continue
      }

      // Try to extract outcome from rawData
      let actualOutcome: string | null = null

      if (dispute.rawData && typeof dispute.rawData === "object") {
        const raw = dispute.rawData as any

        // Check for outcome field
        if (
          raw.outcome &&
          typeof raw.outcome === "string" &&
          raw.outcome.trim() !== "" &&
          raw.outcome.toUpperCase() !== "RESOLVED" &&
          raw.outcome.toUpperCase() !== "CLOSED"
        ) {
          actualOutcome = raw.outcome.trim()
        }
        // Check for dispute_outcome
        else if (
          raw.dispute_outcome &&
          typeof raw.dispute_outcome === "string" &&
          raw.dispute_outcome.trim() !== "" &&
          raw.dispute_outcome.toUpperCase() !== "RESOLVED" &&
          raw.dispute_outcome.toUpperCase() !== "CLOSED"
        ) {
          actualOutcome = raw.dispute_outcome.trim()
        }
        // Check adjudications
        else if (
          raw.adjudications &&
          Array.isArray(raw.adjudications) &&
          raw.adjudications.length > 0
        ) {
          const lastAdjudication = raw.adjudications[raw.adjudications.length - 1]
          if (
            lastAdjudication.type &&
            lastAdjudication.type.toUpperCase() !== "RESOLVED" &&
            lastAdjudication.type.toUpperCase() !== "CLOSED"
          ) {
            actualOutcome = lastAdjudication.type.trim()
          }
        }
      }

      if (actualOutcome) {
        await prisma.dispute.update({
          where: { id: dispute.id },
          data: { disputeOutcome: actualOutcome },
        })
        console.log(
          `✅ Updated dispute ${dispute.disputeId}: "${dispute.disputeOutcome || "null"}" → "${actualOutcome}"`
        )
        updated++
      } else {
        console.log(
          `⚠️  Dispute ${dispute.disputeId} has no valid outcome in rawData. Status: "${dispute.disputeStatus}", Stored outcome: "${dispute.disputeOutcome || "null"}"`
        )
        skipped++
      }
    } catch (error) {
      console.error(`❌ Error processing dispute ${dispute.disputeId}:`, error)
      errors++
    }
  }

  console.log("\n📈 Summary:")
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log("🎉 Fix completed!")
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


