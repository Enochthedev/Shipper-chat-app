import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMessageToAI, isAIServiceAvailable } from '@/lib/ai';

// AI Bot user email constant
const AI_BOT_EMAIL = 'ai-assistant@chatapp.ai';

export async function POST(request: NextRequest) {
  console.log('[AI Chat] Request received');
  
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      console.log('[AI Chat] Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[AI Chat] User:', session.user.email);

    // Check if AI service is available
    if (!isAIServiceAvailable()) {
      console.log('[AI Chat] AI service not configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please add HUGGINGFACE_API_KEY or OPENAI_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, sessionId } = body;

    console.log('[AI Chat] Message:', message);
    console.log('[AI Chat] Session ID:', sessionId);

    if (!message || typeof message !== 'string') {
      console.log('[AI Chat] Invalid message');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get AI bot user
    const aiBot = await prisma.user.findUnique({
      where: { email: AI_BOT_EMAIL },
    });

    if (!aiBot) {
      return NextResponse.json(
        { error: 'AI bot not found. Please run database seed.' },
        { status: 404 }
      );
    }

    // Find or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10, // Get last 10 messages for context
          },
        },
      });
    }

    if (!chatSession) {
      // Sort user IDs to ensure consistent ordering (prevents duplicate sessions)
      const [user1Id, user2Id] = [currentUser.id, aiBot.id].sort();
      
      // Try to find existing session first
      chatSession = await prisma.chatSession.findUnique({
        where: {
          user1Id_user2Id: {
            user1Id,
            user2Id,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
        },
      });
      
      // Create new session if it doesn't exist, with race condition handling
      if (!chatSession) {
        try {
          chatSession = await prisma.chatSession.create({
            data: {
              user1Id,
              user2Id,
              isAiChat: true,
            },
            include: {
              messages: {
                orderBy: { createdAt: 'asc' },
                take: 10,
              },
            },
          });
        } catch (error: any) {
          // Handle race condition - session was created by another request
          if (error.code === 'P2002') {
            chatSession = await prisma.chatSession.findUnique({
              where: {
                user1Id_user2Id: {
                  user1Id,
                  user2Id,
                },
              },
              include: {
                messages: {
                  orderBy: { createdAt: 'asc' },
                  take: 10,
                },
              },
            });
            
            if (!chatSession) {
              throw new Error('Failed to create or fetch AI chat session');
            }
          } else {
            throw error;
          }
        }
      }
    }

    // Save user's message to database
    const userMessage = await prisma.message.create({
      data: {
        content: message,
        senderId: currentUser.id,
        recipientId: aiBot.id,
        sessionId: chatSession.id,
        isAiMessage: false,
      },
    });

    // Build conversation history for context
    const conversationHistory = chatSession.messages.map((msg) => ({
      role: (msg.senderId === currentUser.id ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add the current message to history
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Get AI response
    let aiResponse: string;
    try {
      console.log('[AI Chat] Calling AI service...');
      aiResponse = await sendMessageToAI(message, conversationHistory);
      console.log('[AI Chat] AI response received:', aiResponse.substring(0, 100));
    } catch (error) {
      // If AI fails, return a fallback message
      console.error('[AI Chat] AI service error:', error);
      aiResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
    }

    // Save AI's response to database
    const aiMessage = await prisma.message.create({
      data: {
        content: aiResponse,
        senderId: aiBot.id,
        recipientId: currentUser.id,
        sessionId: chatSession.id,
        isAiMessage: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Return both messages
    console.log('[AI Chat] Success - returning response');
    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        senderId: userMessage.senderId,
        createdAt: userMessage.createdAt,
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiMessage.content,
        senderId: aiMessage.senderId,
        sender: aiMessage.sender,
        createdAt: aiMessage.createdAt,
      },
      sessionId: chatSession.id,
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
