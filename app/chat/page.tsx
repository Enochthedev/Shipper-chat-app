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
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex w-full md:w-80 flex-shrink-0`}
      >
        <Sidebar
          onSelectUser={(user) => {
            setSelectedUser(user)
            setShowProfile(false)
            setShowSidebar(false) // Hide sidebar on mobile when user is selected
          }}
          selectedUserId={selectedUser?.id}
        />
      </div>

      {/* Main Chat Area - Full screen on mobile when open */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } md:flex flex-1 min-w-0`}
      >
        <ChatWindow
          selectedUser={selectedUser}
          onShowProfile={() => setShowProfile(!showProfile)}
          onBack={() => setShowSidebar(true)} // Show sidebar when back button clicked
        />

        {/* User Profile Sidebar - Overlay on mobile */}
        {showProfile && selectedUser && (
          <div className="fixed inset-0 md:relative md:inset-auto z-50 md:z-auto">
            <UserProfile
              user={selectedUser}
              onClose={() => setShowProfile(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
