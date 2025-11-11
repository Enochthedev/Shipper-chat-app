import { io } from "socket.io-client"
import jwt from "jsonwebtoken"

// Use Alice's credentials for testing
const aliceId = "cmhuklae900008z3r4ad4mkep"
const aliceEmail = "alice@example.com"
const bobId = "cmhuklbuv00018z3ryd1g2k1n"

const secret = process.env.NEXTAUTH_SECRET || "change-this-to-a-secure-random-string"

const token = jwt.sign(
  { id: aliceId, email: aliceEmail },
  secret,
  { expiresIn: "1h" }
)

console.log("🧪 WebSocket Messaging Test")
console.log("=" .repeat(50))
console.log(`👤 Testing as: Alice (${aliceId})`)
console.log(`📬 Sending to: Bob (${bobId})`)
console.log("=" .repeat(50))

const socket = io("ws://localhost:3001", {
  auth: { token },
})

socket.on("connect", () => {
  console.log("\n✅ Connected to WebSocket server")
  console.log(`   Socket ID: ${socket.id}`)
  
  // Wait a bit then send message
  setTimeout(() => {
    console.log("\n📤 Sending message to Bob...")
    socket.emit("message:send", {
      recipientId: bobId,
      content: "Hello Bob! This is a test message from Alice via WebSocket.",
    })
  }, 1000)
})

socket.on("connect_error", (error) => {
  console.error("\n❌ Connection error:", error.message)
  process.exit(1)
})

socket.on("users:online", (data) => {
  console.log(`\n👥 Online users: ${data.userIds.length} user(s)`)
})

socket.on("user:online", (data) => {
  console.log(`🟢 User online: ${data.userId}`)
})

socket.on("message:sent", (message) => {
  console.log("\n✅ Message sent successfully!")
  console.log(`   Message ID: ${message.id}`)
  console.log(`   Content: "${message.content}"`)
  console.log(`   To: ${message.recipientId}`)
  console.log(`   Session: ${message.sessionId}`)
  console.log(`   Time: ${message.createdAt}`)
  
  // Disconnect after successful send
  setTimeout(() => {
    console.log("\n👋 Test complete, disconnecting...")
    socket.disconnect()
    process.exit(0)
  }, 1000)
})

socket.on("message:error", (error) => {
  console.error("\n❌ Message error:", error)
  socket.disconnect()
  process.exit(1)
})

// Timeout after 10 seconds
setTimeout(() => {
  console.error("\n⏱️  Test timeout - no response received")
  socket.disconnect()
  process.exit(1)
}, 10000)
