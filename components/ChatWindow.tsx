"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { getSocket } from "@/lib/socket"
import { Send, AlertCircle, RefreshCw } from "lucide-react"
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
}

export function ChatWindow({ selectedUser }: ChatWindowProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedMessageId, setFailedMessageId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat session and messages when user is selected
  useEffect(() => {
    if (!selectedUser || !session?.user?.id) {
      setMessages([])
      setSessionId(null)
      setCurrentPage(1)
      setHasMore(false)
      return
    }

    async function loadChatSession() {
      setLoading(true)
      setError(null)

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
        
        // Load initial messages with pagination
        const messagesResponse = await fetch(
          `/api/sessions/${sessionData.id}?page=1&limit=50`
        )
        
        if (!messagesResponse.ok) {
          throw new Error("Failed to load messages")
        }
        
        const messagesData = await messagesResponse.json()
        setMessages(messagesData.messages || [])
        setCurrentPage(1)
        
        // Check if there are more messages to load
        if (messagesData.pagination) {
          setHasMore(messagesData.pagination.page < messagesData.pagination.totalPages)
        }

        // Mark session as read via WebSocket
        try {
          const socket = await getSocket()
          socket.emit("session:markRead", { sessionId: sessionData.id })
        } catch (error) {
          console.error("Error marking session as read:", error)
        }
      } catch (err) {
        console.error("Error loading chat session:", err)
        setError("Failed to load chat history")
      } finally {
        setLoading(false)
      }
    }

    loadChatSession()
  }, [selectedUser, session])

  // Listen for incoming messages and typing events via WebSocket
  useEffect(() => {
    if (!session?.user?.id || !sessionId) {
      return
    }

    let mounted = true

    async function setupMessageListener() {
      try {
        const socket = await getSocket()

        if (!mounted) return

        socket.on("message:receive", (data: Message) => {
          if (mounted && data.sessionId === sessionId) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(msg => msg.id === data.id)) {
                return prev
              }
              return [...prev, data]
            })
            // Stop typing indicator when message is received
            setIsTyping(false)
          }
        })

        // Handle typing start event
        socket.on("typing:start", (data: { userId: string; sessionId: string }) => {
          if (mounted && data.sessionId === sessionId && data.userId === selectedUser?.id) {
            setIsTyping(true)
          }
        })

        // Handle typing stop event
        socket.on("typing:stop", (data: { userId: string; sessionId: string }) => {
          if (mounted && data.sessionId === sessionId && data.userId === selectedUser?.id) {
            setIsTyping(false)
          }
        })

        // Handle reconnection - sync messages
        socket.on("connect", async () => {
          if (!mounted || !sessionId) return
          
          try {
            // Fetch latest messages to sync after reconnection
            const response = await fetch(
              `/api/sessions/${sessionId}?page=1&limit=50`
            )
            
            if (response.ok) {
              const data = await response.json()
              setMessages(data.messages || [])
              
              if (data.pagination) {
                setHasMore(data.pagination.page < data.pagination.totalPages)
              }
            }
          } catch (error) {
            console.error("Error syncing messages after reconnection:", error)
          }
        })
      } catch (error) {
        console.error("Error setting up message listener:", error)
      }
    }

    setupMessageListener()

    return () => {
      mounted = false
    }
  }, [session, sessionId, selectedUser])

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!sessionId || loadingMore || !hasMore) return

    setLoadingMore(true)

    try {
      const nextPage = currentPage + 1
      const response = await fetch(
        `/api/sessions/${sessionId}?page=${nextPage}&limit=50`
      )

      if (!response.ok) {
        throw new Error("Failed to load more messages")
      }

      const data = await response.json()
      
      // Prepend older messages to the beginning
      setMessages((prev) => [...(data.messages || []), ...prev])
      setCurrentPage(nextPage)
      
      if (data.pagination) {
        setHasMore(data.pagination.page < data.pagination.totalPages)
      }
    } catch (err) {
      console.error("Error loading more messages:", err)
      setError("Failed to load more messages")
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle input change and emit typing events
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (!selectedUser || !sessionId) return

    try {
      const socket = await getSocket()

      if (value.trim()) {
        // Emit typing start
        socket.emit("typing:start", {
          recipientId: selectedUser.id,
          sessionId,
        })

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        // Set timeout to emit typing stop after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("typing:stop", {
            recipientId: selectedUser.id,
            sessionId,
          })
        }, 2000)
      } else {
        // Emit typing stop if input is empty
        socket.emit("typing:stop", {
          recipientId: selectedUser.id,
          sessionId,
        })
      }
    } catch (error) {
      console.error("Error emitting typing event:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim() || !selectedUser || !sessionId || !session?.user?.id) {
      return
    }

    // Clear typing timeout and emit typing stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    try {
      const socket = await getSocket()
      socket.emit("typing:stop", {
        recipientId: selectedUser.id,
        sessionId,
      })
    } catch (error) {
      console.error("Error emitting typing stop:", error)
    }

    const messageContent = inputValue.trim()
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
    setInputValue("")
    setSending(true)
    setError(null)
    setFailedMessageId(null)

    try {
      if (isAIBot) {
        // Handle AI chat via API
        // Show typing indicator for AI
        setIsTyping(true)
        
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
        setIsTyping(false)
      } else {
        // Handle regular user chat via WebSocket
        const socket = await getSocket()

        // Send message via WebSocket
        socket.emit("message:send", {
          content: messageContent,
          recipientId: selectedUser.id,
          sessionId,
        })

        // Wait for acknowledgment or timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Message send timeout"))
          }, 5000)

          socket.once("message:sent", (data: Message) => {
            clearTimeout(timeout)
            // Replace optimistic message with real one
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? data : msg))
            )
            resolve()
          })

          socket.once("message:error", (error: { message: string }) => {
            clearTimeout(timeout)
            reject(new Error(error.message))
          })
        })
      }
    } catch (err) {
      console.error("Error sending message:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)
      setFailedMessageId(tempId)
      setIsTyping(false)
      // Mark the optimistic message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, id: `failed-${tempId}` } : msg
        )
      )
    } finally {
      setSending(false)
    }
  }

  const handleRetry = async () => {
    if (!failedMessageId) return

    const failedMessage = messages.find((msg) => msg.id === failedMessageId)
    if (!failedMessage) return

    // Remove failed message
    setMessages((prev) => prev.filter((msg) => msg.id !== failedMessageId))
    
    // Retry by setting input value and triggering send
    setInputValue(failedMessage.content)
    setFailedMessageId(null)
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Empty state when no user is selected
  if (!selectedUser) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10 animate-fadeIn">
        <div className="text-center space-y-3 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">
            Select a user to start chatting
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose someone from the list to begin a conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
          <AvatarImage
            src={selectedUser.image || undefined}
            alt={selectedUser.name || selectedUser.email}
          />
          <AvatarFallback>
            {getInitials(selectedUser.name, selectedUser.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold tracking-tight">
            {selectedUser.name || selectedUser.email}
          </h2>
          {selectedUser.name && (
            <p className="text-sm text-muted-foreground">
              {selectedUser.email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row" : "flex-row-reverse")}>
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className={cn("flex flex-col gap-2 max-w-[70%]", i % 2 === 0 ? "items-start" : "items-end")}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load older messages"}
                </Button>
              </div>
            )}
            
            {messages.map((message) => {
              const isSent = message.senderId === session?.user?.id
              const isFailed = message.id.startsWith("failed-")

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-fadeIn",
                    isSent ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage
                      src={message.sender.image || undefined}
                      alt={message.sender.name || message.sender.email}
                    />
                    <AvatarFallback>
                      {getInitials(message.sender.name, message.sender.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      "flex max-w-[70%] sm:max-w-[60%] md:max-w-[70%] flex-col gap-1",
                      isSent ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {isSent
                          ? "You"
                          : message.sender.name || message.sender.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 shadow-sm transition-all duration-200",
                        isSent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                        isFailed && "opacity-50"
                      )}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                    </div>

                    {isFailed && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span>Failed to send</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {error && failedMessageId && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-destructive/10 p-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="h-8 ml-2"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        )}

        {isTyping && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground animate-fadeIn">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="italic">
              {selectedUser.name || selectedUser.email} is typing...
            </span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            disabled={sending || loading}
            className="flex-1 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || sending || loading}
            size="icon"
            className="transition-all duration-200 hover:scale-105"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
