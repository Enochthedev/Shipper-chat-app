import { io } from "socket.io-client"
import jwt from "jsonwebtoken"

// Use Alice's credentials for testing
// Run `npm run db:seed` first to create these users
const testUserId = "cmhuklae900008z3r4ad4mkep" // Alice
const testEmail = "alice@example.com"
const recipientId = "cmhuklbuv00018z3ryd1g2k1n" // Bob

const secret = process.env.NEXTAUTH_SECRET || "change-this-to-a-secure-random-string"

const token = jwt.sign(
  { id: testUserId, email: testEmail },
  secret,
  { expiresIn: "1h" }
)

console.log("🔑 Generated test token for user:", testUserId, `(${testEmail})`)
console.log("📡 Connecting to WebSocket server...")

// Connect to WebSocket server
const socket = io("ws://localhost:3001", {
  auth: {
    token: token,
  },
})

// Connection events
socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server!")
  console.log("   Socket ID:", socket.id)
  
  // Request online users
  console.log("\n📋 Requesting online users list...")
  socket.emit("status:request")
})

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message)
})

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected:", reason)
})

// Online status events
socket.on("users:online", (data) => {
  console.log("👥 Online users:", data.userIds)
})

socket.on("user:online", (data) => {
  console.log("🟢 User came online:", data.userId)
})

socket.on("user:offline", (data) => {
  console.log("🔴 User went offline:", data.userId)
})

// Message events
socket.on("message:receive", (message) => {
  console.log("📨 Received message:", {
    from: message.senderId,
    content: message.content,
    time: message.createdAt,
  })
})

socket.on("message:sent", (message) => {
  console.log("✉️  Message sent successfully:", {
    to: message.recipientId,
    content: message.content,
  })
})

socket.on("message:error", (error) => {
  console.error("❌ Message error:", error)
})

// Test sending a message after 2 seconds
setTimeout(() => {
  console.log("\n📤 Testing message send to Bob...")
  socket.emit("message:send", {
    recipientId: recipientId,
    content: "Hello Bob! This is a test message from Alice.",
  })
}, 2000)

// Keep the script running
console.log("\n💡 Test client running. Press Ctrl+C to exit.\n")

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Closing connection...")
  socket.disconnect()
  process.exit(0)
})
