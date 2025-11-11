import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          provider: "google",
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account }) {
      // Ensure user exists in database for all providers
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
      })

      if (!existingUser) {
        // This shouldn't happen for credentials provider since authorize checks it
        // But for Google, we need to create the user
        if (account?.provider === "google") {
          // Generate DiceBear avatar if no image provided
          const avatarUrl = user.image || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(user.email!)}`
          
          await prisma.user.create({
            data: {
              id: user.id, // Use the ID from the auth provider
              email: user.email!,
              name: user.name,
              image: avatarUrl,
              provider: "google",
            },
          })
        }
      } else if (account?.provider === "google" && existingUser.provider !== "google") {
        // Update provider if user exists with different provider
        await prisma.user.update({
          where: { email: user.email! },
          data: { provider: "google" },
        })
      }
      return true
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
