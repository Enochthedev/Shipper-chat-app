# Database Setup Guide

## Schema Overview

The database schema includes three main models:

1. **User** - Stores user information and authentication details
2. **ChatSession** - Represents a conversation between two users
3. **Message** - Individual messages within chat sessions

## Quick Setup

### Option 1: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a database:
```bash
createdb chat_app_mvp
```

3. Update `.env` with your connection string:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chat_app_mvp?schema=public"
```

4. Run migrations:
```bash
npm run db:migrate
```

### Option 2: Cloud Database (Railway, Supabase, etc.)

1. Create a PostgreSQL database on your preferred platform
2. Copy the connection string
3. Update `DATABASE_URL` in `.env`
4. Run migrations:
```bash
npm run db:migrate
```

## Available Commands

- `npm run db:migrate` - Create and apply migrations
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes without migrations (dev only)
- `npm run db:studio` - Open Prisma Studio to view/edit data

## Schema Features

### Indexes
The schema includes optimized indexes for:
- User email lookups
- Chat session queries by user
- Message queries by session, sender, recipient
- Message sorting by creation time

### Relationships
- Users can have multiple sent and received messages
- Users can participate in multiple chat sessions
- Chat sessions contain multiple messages
- All relationships use cascade delete for data integrity

## Migration Notes

When you run `npm run db:migrate` for the first time, Prisma will:
1. Connect to your database
2. Create all tables with proper indexes
3. Set up foreign key constraints
4. Generate the Prisma Client for type-safe database access

The migration will be stored in `prisma/migrations/` for version control.
