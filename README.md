# Shipper Chat App

A modern, real-time chat application built with Next.js 14, featuring user-to-user messaging, AI chat capabilities, and dual authentication methods (JWT and Google OAuth).

## Features

- 🔐 **Dual Authentication**: JWT-based and Google OAuth authentication
- 💬 **Real-time Messaging**: WebSocket-powered instant messaging
- 🤖 **AI Chat Integration**: Chat with AI assistants (OpenAI/Anthropic)
- 👥 **User Management**: Browse and connect with other users
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔒 **Secure**: Password hashing with bcrypt, secure session management
- 💾 **PostgreSQL Database**: Robust data persistence with Prisma ORM

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Authentication**: [NextAuth.js v5](https://next-auth.js.org/)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Real-time**: Socket.io
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Language**: TypeScript
- **AI Integration**: OpenAI / Anthropic APIs (optional)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ 
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** database (local or cloud-hosted)
- **Git**

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Enochthedev/Shipper-chat-app.git
cd Shipper-chat-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chat_app_mvp?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# WebSocket
NEXT_PUBLIC_WS_URL="ws://localhost:3001"

# AI Service (Optional - for AI chat feature)
OPENAI_API_KEY="your-openai-api-key"
# OR
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `NEXTAUTH_URL` | ✅ Yes | Base URL of your application. Use `http://localhost:3000` for development |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret key for encrypting tokens. Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | ⚠️ Optional* | Google OAuth Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Optional* | Google OAuth Client Secret from Google Cloud Console |
| `NEXT_PUBLIC_WS_URL` | ✅ Yes | WebSocket server URL. Use `ws://localhost:3001` for development |
| `OPENAI_API_KEY` | ❌ Optional | OpenAI API key for AI chat feature |
| `ANTHROPIC_API_KEY` | ❌ Optional | Anthropic API key for AI chat feature (alternative to OpenAI) |

*Google OAuth is optional if you only want to use JWT (email/password) authentication.

### 4. Set Up the Database

#### Option A: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a database:
   ```bash
   createdb chat_app_mvp
   ```
3. Update `DATABASE_URL` in `.env`

#### Option B: Cloud Database

Use a cloud provider like:
- [Railway](https://railway.app/)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Render](https://render.com/)

Copy the connection string and update `DATABASE_URL` in `.env`

### 5. Run Database Migrations

```bash
npm run db:migrate
```

This will create all necessary tables and relationships in your database.

### 6. Seed the Database (Optional)

Populate the database with sample users and an AI bot:

```bash
npm run db:seed
```

This creates:
- Sample users for testing
- AI Bot user for AI chat feature
- Sample chat sessions and messages

### 7. Start the Development Servers

The application requires **two servers** to run:

#### Terminal 1: Next.js Development Server

```bash
npm run dev
```

This starts the Next.js frontend and API routes at [http://localhost:3000](http://localhost:3000)

#### Terminal 2: WebSocket Server

```bash
npm run ws:dev
```

This starts the WebSocket server at `ws://localhost:3001` for real-time messaging.

**Note**: Both servers must be running for the application to work properly.

## Available Scripts

### Next.js Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run build` | Build Next.js for production |
| `npm run start` | Start Next.js production server |
| `npm run lint` | Run ESLint |

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema changes (dev only) |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Seed database with sample data |

### WebSocket Server Commands

| Command | Description |
|---------|-------------|
| `npm run ws:dev` | Start WebSocket server with auto-reload (port 3001) |
| `npm run ws:start` | Start WebSocket server (production) |
| `npm run ws:test` | Test WebSocket connection |
| `npm run ws:test-msg` | Test WebSocket messaging |

## Project Structure

```
shipper-chat-app/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js authentication
│   │   ├── messages/      # Message CRUD operations
│   │   ├── sessions/      # Chat session management
│   │   ├── users/         # User management
│   │   ├── ai/            # AI chat integration
│   │   └── socket/        # WebSocket token generation
│   ├── auth/              # Authentication pages
│   ├── chat/              # Main chat interface
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/              # Chat-specific components
│   ├── providers/         # Context providers
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts            # NextAuth.js configuration
│   ├── prisma.ts          # Prisma client instance
│   ├── socket.ts          # Socket.io client setup
│   ├── ai.ts              # AI service integration
│   └── utils.ts           # Helper functions
├── server/                # WebSocket server
│   ├── websocket.ts       # Socket.io server implementation
│   ├── test-client.ts     # WebSocket connection test
│   └── test-messaging.ts  # WebSocket messaging test
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Database seeding script
├── types/                 # TypeScript type definitions
└── .env                   # Environment variables (not in git)
```

## Database Schema

The application uses three main models:

- **User**: Stores user information and authentication details
- **ChatSession**: Represents conversations between two users
- **Message**: Individual messages within chat sessions

For detailed schema information, see [prisma/README.md](prisma/README.md)

## Authentication Setup

### Google OAuth Setup (Optional)

If you want to enable Google OAuth login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret** to your `.env` file
9. Restart your development server

### JWT Authentication

JWT (email/password) authentication is enabled by default. Users can:
- Register with email and password
- Login with email and password
- Passwords are securely hashed with bcrypt

No additional configuration is required for JWT authentication.

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors

**Error**: `Can't reach database server at localhost:5432`

**Solutions**:
- Ensure PostgreSQL is running: `pg_isready` (macOS/Linux) or check Services (Windows)
- Verify `DATABASE_URL` in `.env` is correct
- Check if the database exists: `psql -l`
- Try connecting manually: `psql "postgresql://username:password@localhost:5432/chat_app_mvp"`

#### 2. Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm run db:generate
```

#### 3. Migration Errors

**Error**: `Migration failed` or `Database schema is out of sync`

**Solutions**:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or push schema without migration
npm run db:push
```

#### 4. WebSocket Connection Failed

**Error**: `WebSocket connection failed` or messages not sending

**Solutions**:
- Ensure WebSocket server is running: `npm run ws:dev`
- Check `NEXT_PUBLIC_WS_URL` in `.env` matches WebSocket server URL
- Verify port 3001 is not in use: `lsof -i :3001` (macOS/Linux) or `netstat -ano | findstr :3001` (Windows)
- Check browser console for connection errors

#### 5. NextAuth.js Session Errors

**Error**: `[next-auth][error][SESSION_ERROR]`

**Solutions**:
- Ensure `NEXTAUTH_SECRET` is set in `.env`
- Generate a new secret: `openssl rand -base64 32`
- Clear browser cookies and try again
- Restart the development server

#### 6. Google OAuth Not Working

**Error**: `OAuthCallback error` or redirect issues

**Solutions**:
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check authorized redirect URIs in Google Cloud Console
- Ensure `NEXTAUTH_URL` matches your application URL
- Clear browser cache and cookies

#### 7. AI Chat Not Responding

**Error**: AI messages not working or timeout errors

**Solutions**:
- Verify `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set in `.env`
- Check API key is valid and has credits
- Ensure AI Bot user exists in database (run `npm run db:seed`)
- Check API rate limits

#### 8. Port Already in Use

**Error**: `Port 3000 is already in use` or `Port 3001 is already in use`

**Solutions**:
```bash
# Find and kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001 (macOS/Linux)
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### 9. TypeScript Errors

**Error**: Type errors or `Cannot find module` errors

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npm run db:generate
```

#### 10. Build Errors

**Error**: Build fails with module errors

**Solutions**:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/Enochthedev/Shipper-chat-app/issues)
2. Review the [Next.js Documentation](https://nextjs.org/docs)
3. Check [Prisma Documentation](https://www.prisma.io/docs)
4. Review [NextAuth.js Documentation](https://next-auth.js.org/)
5. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

## Deployment

This application requires deploying two separate services:
1. **Next.js Frontend + API** → Vercel
2. **WebSocket Server** → Railway/Render

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Enochthedev/Shipper-chat-app)

#### Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-production-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_WS_URL=wss://your-websocket-server.railway.app
   OPENAI_API_KEY=your-openai-key (optional)
   ANTHROPIC_API_KEY=your-anthropic-key (optional)
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

5. **Test Production Build Locally** (Optional)
   ```bash
   npm run build
   npm run start
   ```

### Important Production Notes

- **Database**: Use a production PostgreSQL database (Railway, Supabase, Neon, or Render)
- **WebSocket Server**: Must be deployed separately (see [DEPLOYMENT.md](DEPLOYMENT.md))
- **Google OAuth**: Update authorized redirect URIs to include production URL
- **CORS**: Configure WebSocket server to allow requests from Vercel domain
- **Environment Variables**: Never commit `.env` files to Git

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you have any questions or run into issues, please open an issue on GitHub.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

---

Made with ❤️ by [Enochthedev](https://github.com/Enochthedev)
