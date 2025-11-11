import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params
    const userId = session.user.id

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Fetch specific chat session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
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
          skip,
          take: limit,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                provider: true,
              },
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                provider: true,
              },
            },
          },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      )
    }

    // Verify user is part of this session
    if (chatSession.user1Id !== userId && chatSession.user2Id !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Get total message count for pagination
    const totalMessages = await prisma.message.count({
      where: { sessionId: id },
    })

    return NextResponse.json({
      ...chatSession,
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching chat session:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat session" },
      { status: 500 }
    )
  }
}
