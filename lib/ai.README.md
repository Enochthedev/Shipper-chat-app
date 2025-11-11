# AI Chat Feature

This module provides AI-powered chat functionality with support for multiple AI providers:
- **Primary**: Hugging Face Inference API (Free tier available)
- **Fallback**: OpenAI GPT-3.5-turbo (Paid service)

## Setup

### Option 1: Hugging Face (Recommended - Free)

1. Create a Hugging Face account at https://huggingface.co
2. Get your API token from https://huggingface.co/settings/tokens
3. Add the token to your `.env` file:
   ```
   HUGGINGFACE_API_KEY="your-hf-token-here"
   ```

The system uses the Mistral-7B-Instruct-v0.2 model by default, which provides good quality responses for free.

### Option 2: OpenAI (Fallback - Paid)

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add the API key to your `.env` file:
   ```
   OPENAI_API_KEY="your-api-key-here"
   ```

### Using Both

You can configure both API keys. The system will:
1. Try Hugging Face first
2. Fall back to OpenAI if Hugging Face fails
3. This provides redundancy and cost optimization

## Usage

The AI Assistant appears in the user list with a special purple "AI" badge and robot icon. Users can chat with the AI just like they would with any other user.

### Features

- **Context-aware responses**: The AI maintains conversation history (last 10 messages) for context
- **Timeout protection**: Requests timeout after 10 seconds to prevent hanging
- **Error handling**: Graceful fallback messages when the AI service is unavailable
- **Typing indicators**: Shows "AI Assistant is typing..." while generating responses
- **Message persistence**: All AI conversations are saved to the database

### API Endpoints

- `POST /api/ai/chat` - Send a message to the AI and receive a response
  - Request body: `{ message: string, sessionId?: string }`
  - Response: `{ userMessage: Message, aiMessage: Message, sessionId: string }`

### Functions

- `sendMessageToAI(message, conversationHistory?)` - Send a message to AI and get a response (tries Hugging Face first, then OpenAI)
- `isAIServiceAvailable()` - Check if any AI service is configured
- `getAIProvider()` - Get the currently active AI provider ('huggingface', 'openai', or 'none')

## Configuration

The AI bot user is automatically seeded in the database with:
- Email: `ai-assistant@chatapp.ai`
- Name: `AI Assistant`
- Provider: `ai`
- Avatar: Generated robot avatar

### AI Models

- **Hugging Face**: Uses Mistral-7B-Instruct-v0.2 (7 billion parameters, instruction-tuned)
- **OpenAI**: Uses GPT-3.5-turbo (175 billion parameters)

Both models are configured with:
- Max tokens: 500
- Temperature: 0.7
- Timeout: 10 seconds

## Notes

- The AI feature is optional and will gracefully degrade if no API key is configured
- Users will see an error message if they try to chat with the AI without a valid API key
- Hugging Face offers a free tier, making it ideal for development and testing
- OpenAI provides higher quality responses but requires payment
- The system automatically falls back to OpenAI if Hugging Face fails
