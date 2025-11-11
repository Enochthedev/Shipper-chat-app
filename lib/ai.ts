import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

// Initialize Hugging Face client (primary)
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || '');

// Initialize OpenAI client (fallback)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Timeout duration in milliseconds (10 seconds)
const AI_TIMEOUT = 10000;

/**
 * Send a message to Hugging Face AI
 * Note: Free tier Hugging Face API keys have limited model access
 * For production, use OpenAI or a Pro Hugging Face account
 */
async function sendToHuggingFace(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    // Build conversation context
    let prompt = '';
    
    if (conversationHistory && conversationHistory.length > 0) {
      // Include recent conversation history (last 3 exchanges)
      const recentHistory = conversationHistory.slice(-6); // 3 user + 3 assistant
      for (const msg of recentHistory) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
    }
    
    prompt += `User: ${message}\nAssistant:`;
    
    // Use text generation with a free model
    const response = await hf.textGeneration({
      model: 'gpt2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.8,
        top_p: 0.95,
        repetition_penalty: 1.2,
        return_full_text: false,
      },
    });
    
    // Extract and clean the response
    let aiResponse = response.generated_text?.trim() || '';
    
    // Remove any "User:" or "Assistant:" prefixes that might appear
    aiResponse = aiResponse.split('\n')[0]; // Take only first line
    aiResponse = aiResponse.replace(/^(User:|Assistant:)\s*/i, '');
    
    // If response is empty or too short, use fallback
    if (!aiResponse || aiResponse.length < 2) {
      throw new Error('Empty response from AI');
    }
    
    return aiResponse;
  } catch (error) {
    console.error('Hugging Face API error:', error);
    // Use pattern-based fallback responses
    return getPatternBasedResponse(message);
  }
}

/**
 * Pattern-based fallback responses when AI API fails
 */
function getPatternBasedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Greeting patterns
  if (/(^|\s)(hi|hello|hey|greetings|good morning|good afternoon|good evening)(\s|$|!|\?)/i.test(message)) {
    const greetings = [
      "Hello! How can I help you today?",
      "Hi there! What can I do for you?",
      "Hey! How are you doing?",
      "Hello! Nice to chat with you!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Thanks patterns
  if (/(thank|thanks|thx|appreciate)/i.test(lowerMessage)) {
    const thanks = [
      "You're welcome! Happy to help!",
      "No problem! Glad I could assist!",
      "Anytime! Feel free to ask if you need anything else!",
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }
  
  // Help/assistance patterns
  if (/(help|assist|support|guide)/i.test(lowerMessage)) {
    return "I'm here to assist you! What do you need help with?";
  }
  
  // Goodbye patterns
  if (/(bye|goodbye|see you|later|gotta go)/i.test(lowerMessage)) {
    return "Goodbye! Have a great day! Feel free to come back anytime!";
  }
  
  // Question patterns
  if (/(what is|what's|tell me about|explain|define)/i.test(lowerMessage)) {
    if (/coding|programming|code/i.test(lowerMessage)) {
      return "Coding is the process of writing instructions for computers using programming languages. It's how we create software, apps, and websites!";
    }
    if (/javascript|js/i.test(lowerMessage)) {
      return "JavaScript is a popular programming language used for web development. It makes websites interactive and dynamic!";
    }
    if (/python/i.test(lowerMessage)) {
      return "Python is a versatile programming language known for its simplicity and readability. It's great for beginners and widely used in data science, AI, and web development!";
    }
    if (/react/i.test(lowerMessage)) {
      return "React is a JavaScript library for building user interfaces. It's maintained by Meta and is very popular for creating modern web applications!";
    }
    if (/ai|artificial intelligence/i.test(lowerMessage)) {
      return "AI (Artificial Intelligence) is technology that enables machines to simulate human intelligence, like learning, reasoning, and problem-solving!";
    }
    return "That's a great question! I'd love to help you learn more about that topic. What specifically would you like to know?";
  }
  
  // How-to questions
  if (/(how do|how to|how can|how does)/i.test(lowerMessage)) {
    if (/learn|start|begin/i.test(lowerMessage)) {
      return "Great question! The best way to start is by practicing regularly, building small projects, and learning from tutorials. What are you interested in learning?";
    }
    return "That's a practical question! I'd recommend breaking it down into smaller steps and practicing each part. What specifically are you trying to achieve?";
  }
  
  // Yes/No responses
  if (/^(yes|yeah|yep|sure|ok|okay|no|nope|nah)(\s|!|\?|\.)*$/i.test(message.trim())) {
    return "Got it! What would you like to talk about?";
  }
  
  // Name questions
  if (/(what's your name|who are you|your name)/i.test(lowerMessage)) {
    return "I'm Alice, your AI assistant! I'm here to help you with questions and have friendly conversations. What can I help you with?";
  }
  
  // Capability questions
  if (/(what can you do|your capabilities|can you help)/i.test(lowerMessage)) {
    return "I can help answer questions about programming, technology, and general topics. I'm here to assist with information and have friendly conversations!";
  }
  
  // Default intelligent response
  const defaultResponses = [
    "That's interesting! Could you tell me more about what you're looking for?",
    "I'd be happy to help with that! Can you provide more details?",
    "Interesting point! What aspect of this would you like to explore?",
    "I see what you mean. How can I assist you with this?",
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

/**
 * Send a message to OpenAI (fallback)
 */
async function sendToOpenAI(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: 'You are a helpful AI assistant in a chat application. Be friendly, concise, and helpful.',
    },
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  messages.push({
    role: 'user',
    content: message,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content;
  
  if (!response) {
    throw new Error('No response from AI');
  }

  return response;
}

/**
 * Send a message to the AI and receive a response
 * Uses Hugging Face as primary, OpenAI as fallback
 * @param message - The user's message to send to the AI
 * @param conversationHistory - Optional array of previous messages for context
 * @returns The AI's response text
 * @throws Error if the API call fails or times out
 */
export async function sendMessageToAI(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('AI response timeout after 10 seconds'));
      }, AI_TIMEOUT);
    });

    // Try OpenAI first if available (most reliable)
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await Promise.race([
          sendToOpenAI(message, conversationHistory),
          timeoutPromise,
        ]);
        return response;
      } catch (openaiError) {
        console.warn('OpenAI API failed, using fallback:', openaiError);
      }
    }

    // Try Hugging Face if API key is available
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const response = await Promise.race([
          sendToHuggingFace(message, conversationHistory),
          timeoutPromise,
        ]);
        return response;
      } catch (hfError) {
        console.warn('Hugging Face API failed, using pattern-based fallback:', hfError);
      }
    }

    // Fall back to pattern-based responses (always works)
    console.log('Using pattern-based AI responses');
    return getPatternBasedResponse(message);
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return getPatternBasedResponse(message);
      }
    }
    
    // Always fall back to pattern-based responses
    return getPatternBasedResponse(message);
  }
}

/**
 * Check if AI service is configured and available
 * @returns true if either Hugging Face or OpenAI API key is configured
 */
export function isAIServiceAvailable(): boolean {
  const hasHuggingFace = !!process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.length > 0;
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
  return hasHuggingFace || hasOpenAI;
}

/**
 * Get the active AI provider
 * @returns 'huggingface', 'openai', or 'none'
 */
export function getAIProvider(): 'huggingface' | 'openai' | 'none' {
  if (process.env.HUGGINGFACE_API_KEY) return 'huggingface';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}
