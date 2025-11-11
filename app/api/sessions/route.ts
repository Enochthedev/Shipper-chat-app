import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Validate session
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Fetch all chat sessions for the current user
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            provider: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            provider: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the last message for preview
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Transform sessions to include last message
    // Note: Unread count feature requires a 'read' field in Message model
    // For now, we'll set unreadCount to 0
    const transformedSessions = chatSessions.map((session) => {
      return {
        ...session,
        lastMessage: session.messages[0] || null,
        unreadCount: 0, // TODO: Add 'read' field to Message model for unread counts
      }
    })

    return NextResponse.json(transformedSessions)
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { otherUserId } = body

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      )
    }

    const currentUserId = session.user.id

    // Ensure users are different
    if (currentUserId === otherUserId) {
      return NextResponse.json(
        { error: "Cannot create session with yourself" },
        { status: 400 }
      )
    }

    // Check if current user exists in database
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    })

    if (!currentUser) {
      console.error("Current user not found in database:", currentUserId)
      return NextResponse.json(
        { error: "Current user not found in database" },
        { status: 404 }
      )
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    })

    if (!otherUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Sort user IDs to ensure consistent ordering (prevents duplicate sessions)
    const [user1Id, user2Id] = [currentUserId, otherUserId].sort()

    // Find or create chat session
    let chatSession = await prisma.chatSession.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            provider: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            provider: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!chatSession) {
      // Create new session with race condition handling
      try {
        chatSession = await prisma.chatSession.create({
          data: {
            user1Id,
            user2Id,
          },
          include: {
            user1: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                provider: true,
              },
            },
            user2: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                provider: true,
              },
            },
            messages: true,
          },
        })
      } catch (error: any) {
        // Handle race condition - session was created by another request
        if (error.code === 'P2002') {
          // Fetch the session that was just created
          chatSession = await prisma.chatSession.findUnique({
            where: {
              user1Id_user2Id: {
                user1Id,
                user2Id,
              },
            },
            include: {
              user1: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  provider: true,
                },
              },
              user2: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  provider: true,
                },
              },
              messages: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          })
          
          if (!chatSession) {
            throw new Error("Failed to create or fetch chat session")
          }
        } else {
          throw error
        }
      }
    }

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error("Error creating/finding chat session:", error)
    return NextResponse.json(
      { error: "Failed to create/find chat session" },
      { status: 500 }
    )
  }
}
