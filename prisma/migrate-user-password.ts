import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Migrating existing users to add password field...")

  // Get all users without password
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { password: null },
        { password: "" },
      ],
    },
  })

  if (users.length === 0) {
    console.log("✅ No users need migration")
    return
  }

  console.log(`Found ${users.length} user(s) to migrate`)

  for (const user of users) {
    // Use passwordHash if available, otherwise generate new hash
    let hashedPassword = user.passwordHash

    if (!hashedPassword) {
      // Generate default password hash
      hashedPassword = await bcrypt.hash("password123", 10)
      console.log(`⚠️  User ${user.email} has no passwordHash, setting default password: password123`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // Also ensure passwordHash is set
        passwordHash: hashedPassword,
      },
    })

    console.log(`✅ Updated user: ${user.email}`)
  }

  console.log("🎉 Migration completed!")
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


