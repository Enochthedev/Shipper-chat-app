"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { useToast } from "@/hooks/use-toast"

let socket: Socket | null = null
let tokenPromise: Promise<string> | null = null

export interface SocketUser {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string
}

export interface OnlineStatusEvent {
  userId: string
}

export interface OnlineUsersEvent {
  userIds: string[]
}

export interface MessageReceiveEvent {
  id: string
  content: string
  senderId: string
  recipientId: string
  sessionId: string
  createdAt: Date
  sender: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface MessageSentEvent extends MessageReceiveEvent {}

export interface MessageErrorEvent {
  error: string
  details?: string
}

async function getSocketToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = fetch("/api/socket/token")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to get socket token")
        }
        return res.json()
      })
      .then((data) => data.token)
      .catch((error) => {
        tokenPromise = null
        throw error
      })
  }
  return tokenPromise
}

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket
  }

  // Get JWT token from API
  const token = await getSocketToken()

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

  socket = io(wsUrl, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  })

  socket.on("connect", () => {
    console.log("WebSocket connected:", socket?.id)
  })

  socket.on("disconnect", (reason) => {
    console.log("WebSocket disconnected:", reason)
  })

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection error:", error.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  tokenPromise = null
}

// Custom React hook for WebSocket management
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const hasShownDisconnectToast = useRef(false)
  const hasShownConnectToast = useRef(false)

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current), maxDelay)
    return delay
  }, [])

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (socketRef.current?.connected || isConnecting) {
      return
    }

    setIsConnecting(true)

    try {
      const socketInstance = await getSocket()
      socketRef.current = socketInstance

      // Connection successful
      socketInstance.on("connect", () => {
        console.log("WebSocket connected")
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttempts.current = 0
        hasShownDisconnectToast.current = false

        // Show success toast only after reconnection (not initial connection)
        if (hasShownConnectToast.current) {
          toast({
            title: "Connected",
            description: "Successfully reconnected to chat server",
          })
        }
        hasShownConnectToast.current = true
      })

      // Handle disconnection
      socketInstance.on("disconnect", (reason) => {
        console.log("WebSocket disconnected:", reason)
        setIsConnected(false)
        setIsConnecting(false)

        // Show disconnect toast only once
        if (!hasShownDisconnectToast.current) {
          toast({
            title: "Disconnected",
            description: "Connection lost. Attempting to reconnect...",
            variant: "destructive",
          })
          hasShownDisconnectToast.current = true
        }

        // Attempt reconnection with exponential backoff
        if (reason === "io server disconnect") {
          // Server disconnected the client, try to reconnect manually
          attemptReconnect()
        }
      })

      // Handle connection errors
      socketInstance.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error.message)
        setIsConnecting(false)
        
        // Attempt reconnection with exponential backoff
        attemptReconnect()
      })

    } catch (error) {
      console.error("Failed to initialize socket:", error)
      setIsConnecting(false)
      
      toast({
        title: "Connection Failed",
        description: "Failed to connect to chat server. Retrying...",
        variant: "destructive",
      })

      // Attempt reconnection
      attemptReconnect()
    }
  }, [isConnecting, toast])

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return // Already attempting to reconnect
    }

    const delay = getReconnectDelay()
    reconnectAttempts.current += 1

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      connect()
    }, delay)
  }, [connect, getReconnectDelay])

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    reconnectAttempts.current = 0
  }, [])

  // Initialize connection on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, []) // Only run once on mount

  // Event listener helpers
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler)
  }, [])

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

  const emit = useCallback((event: string, ...args: any[]) => {
    if (!socketRef.current?.connected) {
      console.warn("Socket not connected, cannot emit event:", event)
      toast({
        title: "Not Connected",
        description: "Cannot send message. Please wait for reconnection.",
        variant: "destructive",
      })
      return false
    }
    socketRef.current.emit(event, ...args)
    return true
  }, [toast])

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    on,
    off,
    emit,
  }
}
