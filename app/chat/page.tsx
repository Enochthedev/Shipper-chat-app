"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/chat/Sidebar"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { UserProfile } from "@/components/chat/UserProfile"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string
}

export default function ChatPage() {
  const { data: session } = useSession()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        onSelectUser={(user) => {
          setSelectedUser(user)
          setShowProfile(false)
        }}
        selectedUserId={selectedUser?.id}
      />

      {/* Main Chat Area */}
      <div className="flex flex-1">
        <ChatWindow
          selectedUser={selectedUser}
          onShowProfile={() => setShowProfile(!showProfile)}
        />

        {/* User Profile Sidebar */}
        {showProfile && selectedUser && (
          <UserProfile
            user={selectedUser}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    </div>
  )
}
