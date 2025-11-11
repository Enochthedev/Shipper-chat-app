"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string
}

interface UserProfileProps {
  user: User
  onClose: () => void
}

export function UserProfile({ user, onClose }: UserProfileProps) {
  const getAvatarUrl = (user: User) => {
    if (user.image) return user.image
    // Use DiceBear fun emoji avatars as fallback
    const seed = user.email || user.id
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`
  }

  return (
    <div className="w-full md:w-80 h-full md:h-auto border-l bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <h3 className="font-semibold">Profile</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Profile Info */}
      <div className="p-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={getAvatarUrl(user)} />
          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400" />
        </Avatar>
        <h2 className="text-xl font-semibold text-gray-900">{user.name || user.email}</h2>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      <Separator />


    </div>
  )
}
