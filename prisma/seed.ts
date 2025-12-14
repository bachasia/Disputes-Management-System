import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Create default admin user
  const adminEmail = "admin@example.com"
  const adminPassword = "Admin@123456"

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log("✅ Admin user already exists")
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminEmail,
        password: hashedPassword,
        passwordHash: hashedPassword, // For backward compatibility
        role: "admin",
        active: true,
      },
    })

    console.log("✅ Created admin user:")
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log("   ⚠️  PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN!")
  }

  // Create demo regular user
  const userEmail = "user@example.com"
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash("User@123456", 10)

    await prisma.user.create({
      data: {
        name: "Regular User",
        email: userEmail,
        password: hashedPassword,
        passwordHash: hashedPassword, // For backward compatibility
        role: "user",
        active: true,
      },
    })

    console.log("✅ Created regular user:")
    console.log(`   Email: ${userEmail}`)
    console.log(`   Password: User@123456`)
  }

  console.log("🎉 Seed completed!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
