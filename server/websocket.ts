import { Server as SocketIOServer } from "socket.io"
import { createServer } from "http"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Track online users: Map<userId, socketId>
const onlineUsers = new Map<string, string>()

// Create HTTP server with health check endpoint
const httpServer = createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ 
      status: "ok", 
      service: "websocket-server",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }))
    return
  }
  
  // Default response for other routes
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not found" }))
})

// Create Socket.io server with CORS configuration
const allowedOrigins = [
  process.env.NEXTAUTH_URL || "http://localhost:3000",
  "http://localhost:3000",
  "https://*.vercel.app",
]

// Add production URL if specified
if (process.env.PRODUCTION_URL) {
  allowedOrigins.push(process.env.PRODUCTION_URL)
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)
      
      // Check if origin matches allowed patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes("*")) {
          // Handle wildcard patterns like https://*.vercel.app
          const pattern = allowed.replace(/\*/g, ".*")
          return new RegExp(`^${pattern}$`).test(origin)
        }
        return allowed === origin
      })
      
      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error("Authentication error: No token provided"))
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return next(new Error("Server configuration error"))
    }

    // Verify JWT token
    const decoded = jwt.verify(token, secret) as { id: string; email: string }
    
    // Attach user info to socket
    socket.data.userId = decoded.id
    socket.data.email = decoded.email
    
    next()
  } catch (error) {
    return next(new Error("Authentication error: Invalid token"))
  }
})

// Connection handler
io.on("connection", (socket) => {
  const userId = socket.data.userId
  
  console.log(`User connected: ${userId} (socket: ${socket.id})`)
  
  // Add user to online users map
  onlineUsers.set(userId, socket.id)
  
  // Broadcast user online status to all connected clients
  io.emit("user:online", { userId })
  
  // Send current online users list to the newly connected user
  socket.emit("users:online", { userIds: Array.from(onlineUsers.keys()) })

  // Handle status request
  socket.on("status:request", () => {
    socket.emit("users:online", { userIds: Array.from(onlineUsers.keys()) })
  })

  // Handle marking session as read
  socket.on("session:markRead", async (data: { sessionId: string }) => {
    try {
      const { sessionId } = data
      
      if (!sessionId) {
        return
      }

      // Get the session
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      })

      if (!session) {
        return
      }

      // Mark session as read (unread count tracking removed for now)
      socket.emit("session:markedRead", { sessionId })
    } catch (error) {
      console.error("Error marking session as read:", error)
    }
  })

  // Handle typing start event
  socket.on("typing:start", (data: { recipientId: string; sessionId: string }) => {
    try {
      const { recipientId, sessionId } = data
      
      if (!recipientId || !sessionId) {
        return
      }

      // Emit typing event to recipient if they're online
      const recipientSocketId = onlineUsers.get(recipientId)
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("typing:start", {
          userId,
          sessionId,
        })
      }
    } catch (error) {
      console.error("Error handling typing:start:", error)
    }
  })

  // Handle typing stop event
  socket.on("typing:stop", (data: { recipientId: string; sessionId: string }) => {
    try {
      const { recipientId, sessionId } = data
      
      if (!recipientId || !sessionId) {
        return
      }

      // Emit typing stop event to recipient if they're online
      const recipientSocketId = onlineUsers.get(recipientId)
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("typing:stop", {
          userId,
          sessionId,
        })
      }
    } catch (error) {
      console.error("Error handling typing:stop:", error)
    }
  })

  // Handle message send event
  socket.on("message:send", async (data: {
    recipientId: string
    content: string
    sessionId?: string
  }) => {
    try {
      const { recipientId, content, sessionId } = data
      
      // Validate input
      if (!recipientId || !content) {
        socket.emit("message:error", { 
          error: "Missing required fields: recipientId and content" 
        })
        return
      }

      // Find or create chat session
      let session
      if (sessionId) {
        session = await prisma.chatSession.findUnique({
          where: { id: sessionId },
        })
      } else {
        // Find existing session or create new one
        const [user1Id, user2Id] = [userId, recipientId].sort()
        session = await prisma.chatSession.findUnique({
          where: {
            user1Id_user2Id: {
              user1Id,
              user2Id,
            },
          },
        })

        if (!session) {
          session = await prisma.chatSession.create({
            data: {
              user1Id,
              user2Id,
            },
          })
        }
      }

      if (!session) {
        socket.emit("message:error", { error: "Failed to create or find session" })
        return
      }

      // Persist message to database
      const message = await prisma.message.create({
        data: {
          content,
          senderId: userId,
          recipientId,
          sessionId: session.id,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              provider: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              provider: true,
            },
          },
        },
      })

      // Update session's updatedAt timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      })

      const messageData = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        recipientId: message.recipientId,
        sessionId: message.sessionId,
        createdAt: message.createdAt,
        sender: message.sender,
        recipient: message.recipient,
      }

      // Emit message to recipient if they're online
      const recipientSocketId = onlineUsers.get(recipientId)
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message:receive", messageData)
      }

      // Confirm message sent to sender
      socket.emit("message:sent", messageData)

    } catch (error) {
      console.error("Error handling message:send:", error)
      socket.emit("message:error", { 
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId} (socket: ${socket.id})`)
    
    // Remove user from online users map
    onlineUsers.delete(userId)
    
    // Broadcast user offline status to all connected clients
    io.emit("user:offline", { userId })
  })
})

// Start server
const PORT = process.env.WS_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server")
  httpServer.close(() => {
    console.log("HTTP server closed")
    prisma.$disconnect()
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server")
  httpServer.close(() => {
    console.log("HTTP server closed")
    prisma.$disconnect()
  })
})
