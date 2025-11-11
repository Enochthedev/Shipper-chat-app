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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Verify user is part of this session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      )
    }

    if (chatSession.user1Id !== userId && chatSession.user2Id !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Fetch messages for the session
    const messages = await prisma.message.findMany({
      where: { sessionId },
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
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
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
    const { content, recipientId, sessionId } = body

    if (!content || !recipientId || !sessionId) {
      return NextResponse.json(
        { error: "content, recipientId, and sessionId are required" },
        { status: 400 }
      )
    }

    const senderId = session.user.id

    // Verify session exists and user is part of it
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      )
    }

    if (chatSession.user1Id !== senderId && chatSession.user2Id !== senderId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Verify recipient is part of the session
    if (chatSession.user1Id !== recipientId && chatSession.user2Id !== recipientId) {
      return NextResponse.json(
        { error: "Recipient is not part of this session" },
        { status: 400 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        recipientId,
        sessionId,
      },
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
    })

    // Update session's updatedAt timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}
