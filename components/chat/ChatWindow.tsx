"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MoreVertical, Send, MessageSquare } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string
}

interface Message {
  id: string
  content: string
  senderId: string
  recipientId: string
  sessionId: string
  createdAt: string
  sender: User
  recipient: User
}

interface ChatWindowProps {
  selectedUser: User | null
  onShowProfile: () => void
}

export function ChatWindow({ selectedUser, onShowProfile }: ChatWindowProps) {
  const { data: session } = useSession()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isConnected, on, off, emit } = useSocket()

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat session and messages
  useEffect(() => {
    if (!selectedUser || !session?.user?.id) {
      setMessages([])
      setSessionId(null)
      setCurrentUserId(null)
      return
    }

    // Immediately clear messages when switching users to prevent flash
    if (currentUserId !== selectedUser.id) {
      setMessages([])
      setSessionId(null)
      setCurrentUserId(selectedUser.id)
    }

    async function loadChatSession() {
      setLoading(true)

      try {
        // Create or get existing session
        const sessionResponse = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            otherUserId: selectedUser.id,
          }),
        })

        if (!sessionResponse.ok) {
          throw new Error("Failed to load chat session")
        }

        const sessionData = await sessionResponse.json()
        setSessionId(sessionData.id)

        // Load messages
        const messagesResponse = await fetch(
          `/api/sessions/${sessionData.id}?page=1&limit=50`
        )

        if (!messagesResponse.ok) {
          throw new Error("Failed to load messages")
        }

        const messagesData = await messagesResponse.json()
        
        // Only set messages if we're still on the same user (prevent race condition)
        if (selectedUser.id === currentUserId) {
          setMessages(messagesData.messages || [])
        }
      } catch (err) {
        console.error("Error loading chat session:", err)
      } finally {
        setLoading(false)
      }
    }

    loadChatSession()
  }, [selectedUser, session, currentUserId])

  // Listen for incoming messages and online status via WebSocket
  useEffect(() => {
    if (!session?.user?.id || !isConnected || !sessionId) {
      return
    }

    const handleMessageReceive = (data: Message) => {
      // Only add message if it belongs to the current session
      if (data.sessionId === sessionId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((msg) => msg.id === data.id)) {
            return prev
          }
          return [...prev, data]
        })
      }
    }

    const handleUsersOnline = (data: { userIds: string[] }) => {
      setOnlineUserIds(new Set(data.userIds))
    }

    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set([...prev, data.userId]))
    }

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    }

    on("message:receive", handleMessageReceive)
    on("users:online", handleUsersOnline)
    on("user:online", handleUserOnline)
    on("user:offline", handleUserOffline)
    emit("status:request")

    return () => {
      off("message:receive", handleMessageReceive)
      off("users:online", handleUsersOnline)
      off("user:online", handleUserOnline)
      off("user:offline", handleUserOffline)
    }
  }, [session, sessionId, isConnected, on, off, emit])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !selectedUser || !sessionId || !session?.user?.id || sending) {
      return
    }

    const messageContent = message.trim()
    const tempId = `temp-${Date.now()}`
    
    // Check if selected user is AI bot
    const isAIBot = selectedUser.provider === "ai" || selectedUser.email === "ai-assistant@chatapp.ai"

    // Optimistic UI update
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: session.user.id,
      recipientId: selectedUser.id,
      sessionId,
      createdAt: new Date().toISOString(),
      sender: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
        image: session.user.image || null,
        provider: "jwt",
      },
      recipient: selectedUser,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessage("")
    setSending(true)

    try {
      if (isAIBot) {
        // Handle AI chat via API
        console.log('[ChatWindow] Sending message to AI...')
        
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageContent,
            sessionId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to send message to AI")
        }

        const data = await response.json()
        console.log('[ChatWindow] AI response received:', data)
        
        // Replace optimistic message with real user message
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, id: data.userMessage.id } : msg))
        )
        
        // Add AI response
        const aiMessage: Message = {
          id: data.aiMessage.id,
          content: data.aiMessage.content,
          senderId: data.aiMessage.senderId,
          recipientId: session.user.id,
          sessionId: data.sessionId,
          createdAt: data.aiMessage.createdAt,
          sender: data.aiMessage.sender,
          recipient: {
            id: session.user.id,
            name: session.user.name || null,
            email: session.user.email || "",
            image: session.user.image || null,
            provider: "jwt",
          },
        }
        
        setMessages((prev) => [...prev, aiMessage])
      } else {
        // Handle regular user chat via WebSocket
        if (!isConnected) {
          throw new Error("Not connected to chat server")
        }

        // Send message via WebSocket
        emit("message:send", {
          content: messageContent,
          recipientId: selectedUser.id,
          sessionId,
        })

        // Wait for acknowledgment
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Message send timeout"))
          }, 5000)

          const handleSent = (data: Message) => {
            clearTimeout(timeout)
            // Replace optimistic message with real one
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? data : msg))
            )
            off("message:sent", handleSent)
            off("message:error", handleError)
            resolve()
          }

          const handleError = (error: { message: string }) => {
            clearTimeout(timeout)
            off("message:sent", handleSent)
            off("message:error", handleError)
            reject(new Error(error.message))
          }

          on("message:sent", handleSent)
          on("message:error", handleError)
        })
      }
    } catch (err) {
      console.error("Error sending message:", err)
      // Remove failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      setMessage(messageContent) // Restore message
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getAvatarUrl = (user: User) => {
    if (user.image) return user.image
    // Use DiceBear fun emoji avatars as fallback
    const seed = user.email || user.id
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`
  }

  if (!selectedUser) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30 animate-fadeIn">
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg">
            <MessageSquare className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Select a conversation</h3>
          <p className="text-sm text-gray-600 max-w-sm">
            Choose a connection from the list to start chatting and collaborate
          </p>
        </div>
      </div>
    )
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <div className="flex flex-1 flex-col bg-white animate-fadeIn">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-11 w-11 cursor-pointer ring-2 ring-blue-100 hover:ring-blue-200 transition-all shadow-sm" 
            onClick={onShowProfile}
          >
            <AvatarImage src={getAvatarUrl(selectedUser)} />
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400" />
          </Avatar>
          <div>
            <h2 className="font-bold text-gray-900">
              {selectedUser.name || selectedUser.email}
            </h2>
            {onlineUserIds.has(selectedUser.id) ? (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-gray-600 font-medium">Active now</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Offline</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  i % 2 === 0 ? "flex-row" : "flex-row-reverse"
                )}
              >
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div
                  className={cn(
                    "flex flex-col gap-2 max-w-[70%]",
                    i % 2 === 0 ? "items-start" : "items-end"
                  )}
                >
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isSent = msg.senderId === session?.user?.id

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3 animate-fadeIn",
                    isSent ? "justify-end" : "justify-start"
                  )}
                >
                  {!isSent && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={getAvatarUrl(msg.sender)} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400" />
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "flex-1 max-w-md",
                      isSent ? "flex justify-end" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 inline-block",
                        isSent
                          ? "rounded-tr-sm bg-blue-500 text-white"
                          : "rounded-tl-sm bg-gray-100 text-gray-900"
                      )}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isSent ? "text-blue-100" : "text-gray-500"
                        )}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>

                  {isSent && session?.user && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage
                        src={getAvatarUrl({
                          id: session.user.id || "",
                          name: session.user.name,
                          email: session.user.email || "",
                          image: session.user.image,
                          provider: "jwt",
                        })}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500" />
                    </Avatar>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t px-6 py-4 bg-white shadow-lg">
        {!isConnected && (
          <div className="mb-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg animate-fadeIn">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Reconnecting to chat server...</span>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="pr-12 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
              disabled={sending || loading || !isConnected}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            disabled={!message.trim() || sending || loading || !isConnected}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
