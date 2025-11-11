"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSocket } from "@/lib/socket"
import { Search, LogOut, MessageSquare, Users, Heart, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string
}

interface ChatSession {
  id: string
  user: User
  lastMessage?: {
    content: string
    createdAt: string
    senderId: string
  }
  unreadCount: number
}

interface SidebarProps {
  onSelectUser: (user: User) => void
  selectedUserId?: string
}

export function Sidebar({ onSelectUser, selectedUserId }: SidebarProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { isConnected, on, off, emit } = useSocket()

  // Fetch users and sessions
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all users
        const usersResponse = await fetch("/api/users")
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }

        // Fetch sessions with last messages
        const sessionsResponse = await fetch("/api/sessions")
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json()
          
          // Transform sessions to include user info and unread count
          const transformedSessions: ChatSession[] = sessionsData.map((s: any) => {
            const otherUser = s.user1.id === session?.user?.id ? s.user2 : s.user1
            return {
              id: s.id,
              user: otherUser,
              lastMessage: s.lastMessage,
              unreadCount: s.unreadCount || 0,
            }
          })
          
          setSessions(transformedSessions)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    if (session?.user?.id) {
      fetchData()
    }
  }, [session])

  // WebSocket online status and message updates
  useEffect(() => {
    if (!session?.user?.id || !isConnected) return

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

    const handleMessageReceive = (message: any) => {
      // Update sessions with new message
      setSessions((prev) => {
        const otherUserId = message.senderId === session.user?.id ? message.recipientId : message.senderId
        const existingSessionIndex = prev.findIndex(s => s.user.id === otherUserId)
        
        if (existingSessionIndex >= 0) {
          const updated = [...prev]
          const existingSession = updated[existingSessionIndex]
          
          // Update last message and increment unread if not selected
          updated[existingSessionIndex] = {
            ...existingSession,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            unreadCount: message.senderId !== session.user?.id && selectedUserId !== otherUserId
              ? existingSession.unreadCount + 1
              : existingSession.unreadCount,
          }
          
          return updated
        }
        
        return prev
      })
      
      // Show notification if message is from someone else and not currently selected
      if (message.senderId !== session.user?.id && message.senderId !== selectedUserId) {
        const sender = users.find(u => u.id === message.senderId)
        if (sender && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${sender.name || sender.email}`, {
            body: message.content.substring(0, 100),
            icon: sender.image || undefined,
          })
        }
      }
    }

    on("users:online", handleUsersOnline)
    on("user:online", handleUserOnline)
    on("user:offline", handleUserOffline)
    on("message:receive", handleMessageReceive)
    emit("status:request")

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      off("users:online", handleUsersOnline)
      off("user:online", handleUserOnline)
      off("user:offline", handleUserOffline)
      off("message:receive", handleMessageReceive)
    }
  }, [session, isConnected, on, off, emit, selectedUserId, users])

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

  const getAvatarUrl = (user: User) => {
    if (user.image) return user.image
    // Use DiceBear fun emoji avatars as fallback
    const seed = user.email || user.id
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`
  }

  const isOnline = (userId: string) => onlineUserIds.has(userId)

  // Combine users with sessions and sort
  const getDisplayList = () => {
    const sessionUserIds = new Set(sessions.map(s => s.user.id))
    
    // Users with sessions
    const usersWithSessions = sessions.map(s => ({
      ...s.user,
      lastMessage: s.lastMessage,
      unreadCount: s.unreadCount,
      hasSession: true,
    }))
    
    // Users without sessions
    const usersWithoutSessions = users
      .filter(u => u.id !== session?.user?.id && !sessionUserIds.has(u.id))
      .map(u => ({
        ...u,
        lastMessage: undefined,
        unreadCount: 0,
        hasSession: false,
      }))
    
    // Combine and filter by search
    const allUsers = [...usersWithSessions, ...usersWithoutSessions].filter((user) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      )
    })
    
    // Sort: AI first, then by last message time, then alphabetically
    return allUsers.sort((a, b) => {
      // AI Assistant always on top
      const aIsAI = a.provider === 'ai' || a.email === 'ai-assistant@chatapp.ai'
      const bIsAI = b.provider === 'ai' || b.email === 'ai-assistant@chatapp.ai'
      
      if (aIsAI && !bIsAI) return -1
      if (!aIsAI && bIsAI) return 1
      
      // Then sort by last message time
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      }
      if (a.lastMessage && !b.lastMessage) return -1
      if (!a.lastMessage && b.lastMessage) return 1
      
      // Finally alphabetically
      const aName = a.name || a.email
      const bName = b.name || b.email
      return aName.localeCompare(bName)
    })
  }
  
  const filteredUsers = getDisplayList()

  return (
    <div className="flex h-full w-80 flex-col border-r bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-blue-100 hover:ring-blue-200 transition-all">
          <AvatarImage
            src={
              session?.user
                ? getAvatarUrl({
                    id: session.user.id || "",
                    name: session.user.name,
                    email: session.user.email || "",
                    image: session.user.image,
                    provider: "jwt",
                  })
                : undefined
            }
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500" />
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-red-50 hover:text-red-600 transition-colors"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Friends Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h2 className="text-sm font-semibold text-gray-900">Friends</h2>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {filteredUsers.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1 bg-white">
        <div className="space-y-0.5 px-2 py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
              <p className="text-sm text-gray-500">Loading connections...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-2">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No users found</p>
              <p className="text-xs text-gray-500">Try adjusting your search</p>
            </div>
          ) : (
            filteredUsers.map((user: any, index) => {
              const isAI = user.provider === 'ai' || user.email === 'ai-assistant@chatapp.ai'
              const formatTime = (dateString: string) => {
                const date = new Date(dateString)
                const now = new Date()
                const diffMs = now.getTime() - date.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const diffHours = Math.floor(diffMs / 3600000)
                const diffDays = Math.floor(diffMs / 86400000)
                
                if (diffMins < 1) return 'Just now'
                if (diffMins < 60) return `${diffMins}m`
                if (diffHours < 24) return `${diffHours}h`
                if (diffDays < 7) return `${diffDays}d`
                return date.toLocaleDateString()
              }
              
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user)
                    // Clear unread count when selecting
                    if (user.unreadCount > 0) {
                      setSessions(prev => prev.map(s => 
                        s.user.id === user.id ? { ...s, unreadCount: 0 } : s
                      ))
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 hover:bg-gray-50 hover:shadow-sm animate-fadeIn",
                    selectedUserId === user.id && "bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm ring-2 ring-blue-100"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                      <AvatarImage src={getAvatarUrl(user)} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400" />
                    </Avatar>
                    {isOnline(user.id) && !isAI && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm animate-pulse" />
                    )}
                    {isAI && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-purple-500 shadow-sm">
                        <span className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-75" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="truncate font-semibold text-sm text-gray-900">
                        {user.name || user.email}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {user.lastMessage && (
                          <span className="flex-shrink-0 text-xs text-gray-400">
                            {formatTime(user.lastMessage.createdAt)}
                          </span>
                        )}
                        {user.unreadCount > 0 && (
                          <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-500 rounded-full">
                            {user.unreadCount > 99 ? '99+' : user.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {user.lastMessage ? (
                        <>
                          {user.lastMessage.senderId === session?.user?.id && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {user.lastMessage.content}
                        </>
                      ) : (
                        user.name ? user.email : "Click to start chatting"
                      )}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
