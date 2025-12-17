import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Updating user passwords...")

  // Update admin user
  const adminEmail = "admin@example.com"
  const adminPassword = "Admin@123456"
  const adminHashedPassword = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.updateMany({
    where: { email: adminEmail },
    data: {
      password: adminHashedPassword,
      passwordHash: adminHashedPassword,
    },
  })

  if (admin.count > 0) {
    console.log("✅ Updated admin user password")
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
  } else {
    console.log("⚠️  Admin user not found")
  }

  // Update regular user
  const userEmail = "user@example.com"
  const userPassword = "User@123456"
  const userHashedPassword = await bcrypt.hash(userPassword, 10)

  const user = await prisma.user.updateMany({
    where: { email: userEmail },
    data: {
      password: userHashedPassword,
      passwordHash: userHashedPassword,
    },
  })

  if (user.count > 0) {
    console.log("✅ Updated regular user password")
    console.log(`   Email: ${userEmail}`)
    console.log(`   Password: ${userPassword}`)
  } else {
    console.log("⚠️  Regular user not found")
  }

  console.log("🎉 Password update completed!")
}

main()
  .catch((e) => {
    console.error("❌ Update failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


