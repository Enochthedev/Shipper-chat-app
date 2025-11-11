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

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema changes (dev only) |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
shipper-chat-app/
├── app/                    # Next.js app router pages
├── components/             # React components
├── lib/                    # Utility functions and configurations
│   ├── prisma.ts          # Prisma client instance
│   └── utils.ts           # Helper functions
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   └── migrations/        # Database migrations
├── public/                # Static assets
└── .env                   # Environment variables (not in git)
```

## Database Schema

The application uses three main models:

- **User**: Stores user information and authentication details
- **ChatSession**: Represents conversations between two users
- **Message**: Individual messages within chat sessions

For detailed schema information, see [prisma/README.md](prisma/README.md)

## Authentication Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

### JWT Authentication

JWT authentication is enabled by default. Users can register with email and password.

## Deployment

### Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Enochthedev/Shipper-chat-app)

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- Update `NEXTAUTH_URL` to your production URL
- Use a strong `NEXTAUTH_SECRET`
- Configure production database URL
- Add OAuth credentials
- Set WebSocket URL for production

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
