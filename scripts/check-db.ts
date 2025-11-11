import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("📊 Checking database...")
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
    },
  })
  
  console.log("\n👥 Users in database:")
  console.table(users)
  
  const sessions = await prisma.chatSession.findMany({
    include: {
      user1: { select: { email: true } },
      user2: { select: { email: true } },
    },
  })
  
  console.log("\n💬 Chat sessions:")
  console.table(sessions)
  
  const messages = await prisma.message.findMany({
    include: {
      sender: { select: { email: true } },
      recipient: { select: { email: true } },
    },
  })
  
  console.log("\n📨 Messages:")
  console.table(messages)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
