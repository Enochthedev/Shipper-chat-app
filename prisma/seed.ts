import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create test users with JWT credentials
  const hashedPassword = await bcrypt.hash("password123", 10)
  
  const user1 = await prisma.user.upsert({
    where: { email: "alice.london@example.com" },
    update: {
      name: "Alice Johnson",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=alice.london@example.com",
    },
    create: {
      email: "alice.london@example.com",
      name: "Alice Johnson",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=alice.london@example.com",
      password: hashedPassword,
      provider: "jwt",
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "bob.sweden@example.com" },
    update: {
      name: "Bob Andersson",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=bob.sweden@example.com",
    },
    create: {
      email: "bob.sweden@example.com",
      name: "Bob Andersson",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=bob.sweden@example.com",
      password: hashedPassword,
      provider: "jwt",
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: "charlie.us@example.com" },
    update: {
      name: "Charlie Williams",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=charlie.us@example.com",
    },
    create: {
      email: "charlie.us@example.com",
      name: "Charlie Williams",
      image: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=charlie.us@example.com",
      password: hashedPassword,
      provider: "jwt",
    },
  })

  // Create AI bot user
  const aiBot = await prisma.user.upsert({
    where: { email: "ai-assistant@chatapp.ai" },
    update: {},
    create: {
      email: "ai-assistant@chatapp.ai",
      name: "AI Assistant",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant",
      provider: "ai",
    },
  })

  console.log("✅ Seeded users:")
  console.log("  - Alice:", user1.id, user1.email)
  console.log("  - Bob:", user2.id, user2.email)
  console.log("  - Charlie:", user3.id, user3.email)
  console.log("  - AI Assistant:", aiBot.id, aiBot.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
