# WebSocket Server

This directory contains the standalone WebSocket server for real-time communication in the chat application.

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run ws:dev
```

### Production Mode
```bash
npm run ws:start
```

## Environment Variables

Make sure the following environment variables are set in your `.env` file:

- `NEXTAUTH_SECRET`: Secret key for JWT verification (must match Next.js app)
- `NEXTAUTH_URL`: URL of the Next.js application (for CORS)
- `DATABASE_URL`: PostgreSQL connection string
- `WS_PORT`: Port for WebSocket server (default: 3001)

## Features

### Authentication
- JWT-based authentication for WebSocket connections
- Token verification using NextAuth.js secret

### Real-time Messaging
- `message:send`: Send a message to another user
- `message:receive`: Receive a message from another user
- `message:sent`: Confirmation that message was sent
- `message:error`: Error handling for failed messages

### Online Status
- `user:online`: Broadcast when a user connects
- `user:offline`: Broadcast when a user disconnects
- `status:request`: Request current list of online users
- `users:online`: Receive list of online user IDs

## Client Connection Example

```typescript
import { io } from "socket.io-client"

const socket = io("ws://localhost:3001", {
  auth: {
    token: "your-jwt-token"
  }
})

// Listen for connection
socket.on("connect", () => {
  console.log("Connected to WebSocket server")
})

// Send a message
socket.emit("message:send", {
  recipientId: "user-id",
  content: "Hello!",
  sessionId: "optional-session-id"
})

// Receive messages
socket.on("message:receive", (message) => {
  console.log("New message:", message)
})

// Listen for online status updates
socket.on("user:online", ({ userId }) => {
  console.log(`User ${userId} is now online`)
})

socket.on("user:offline", ({ userId }) => {
  console.log(`User ${userId} is now offline`)
})
```

## Architecture

- **HTTP Server**: Created using Node.js `http` module
- **Socket.io**: WebSocket library for real-time bidirectional communication
- **Prisma**: ORM for database operations
- **JWT**: Token-based authentication

## Error Handling

The server handles various error scenarios:
- Invalid or missing JWT tokens
- Database connection errors
- Message validation failures
- Socket disconnections

All errors are logged to the console and appropriate error events are emitted to clients.
