# WebSocket Client Integration

This module provides WebSocket client functionality for real-time communication in the chat application.

## Features

- **Automatic Connection Management**: Connects to WebSocket server on initialization
- **Exponential Backoff Reconnection**: Automatically reconnects with increasing delays (1s, 2s, 4s, 8s, up to 30s)
- **Toast Notifications**: Displays connection status to users
- **React Hook**: Easy-to-use `useSocket` hook for React components
- **JWT Authentication**: Securely authenticates WebSocket connections using session tokens

## Usage

### Using the `useSocket` Hook

The `useSocket` hook provides a simple interface for managing WebSocket connections in React components:

```typescript
import { useSocket } from "@/lib/socket"

function MyComponent() {
  const { isConnected, isConnecting, on, off, emit } = useSocket()

  useEffect(() => {
    if (!isConnected) return

    // Listen for events
    const handleMessage = (data) => {
      console.log("Received message:", data)
    }

    on("message:receive", handleMessage)

    // Cleanup
    return () => {
      off("message:receive", handleMessage)
    }
  }, [isConnected, on, off])

  const sendMessage = () => {
    emit("message:send", {
      recipientId: "user-id",
      content: "Hello!",
      sessionId: "session-id"
    })
  }

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  )
}
```

### Hook API

#### Return Values

- `socket`: The Socket.io client instance (or null if not connected)
- `isConnected`: Boolean indicating if the socket is connected
- `isConnecting`: Boolean indicating if a connection attempt is in progress
- `connect()`: Manually trigger a connection attempt
- `disconnect()`: Manually disconnect from the server
- `on(event, handler)`: Register an event listener
- `off(event, handler)`: Remove an event listener
- `emit(event, ...args)`: Emit an event to the server

### Available Events

#### Client → Server

- `message:send`: Send a message to another user
  ```typescript
  emit("message:send", {
    recipientId: string,
    content: string,
    sessionId?: string
  })
  ```

- `status:request`: Request current online users list
  ```typescript
  emit("status:request")
  ```

#### Server → Client

- `users:online`: Receive list of currently online users
  ```typescript
  on("users:online", (data: { userIds: string[] }) => {
    // Handle online users
  })
  ```

- `user:online`: A user came online
  ```typescript
  on("user:online", (data: { userId: string }) => {
    // Handle user online
  })
  ```

- `user:offline`: A user went offline
  ```typescript
  on("user:offline", (data: { userId: string }) => {
    // Handle user offline
  })
  ```

- `message:receive`: Receive a new message
  ```typescript
  on("message:receive", (data: MessageReceiveEvent) => {
    // Handle received message
  })
  ```

- `message:sent`: Confirmation that your message was sent
  ```typescript
  on("message:sent", (data: MessageSentEvent) => {
    // Handle message confirmation
  })
  ```

- `message:error`: Error sending a message
  ```typescript
  on("message:error", (data: MessageErrorEvent) => {
    // Handle error
  })
  ```

## Connection Management

### Automatic Reconnection

The WebSocket client automatically attempts to reconnect when the connection is lost:

1. Initial delay: 1 second
2. Each subsequent attempt doubles the delay: 2s, 4s, 8s, 16s, 30s (max)
3. Continues indefinitely until reconnected

### Toast Notifications

Users receive visual feedback about connection status:

- **Disconnected**: "Connection lost. Attempting to reconnect..."
- **Reconnected**: "Successfully reconnected to chat server"
- **Send Failed**: "Cannot send message. Please wait for reconnection."

## Environment Variables

Make sure to set the WebSocket server URL in your `.env` file:

```env
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

For production, update this to your deployed WebSocket server URL.

## Example: UserList Component

See `components/UserList.tsx` for a complete example of using the `useSocket` hook to display online/offline user status in real-time.
