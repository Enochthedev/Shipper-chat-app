import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions = {
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
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
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account }: any) {
      try {
        if (account?.provider === "google") {
          // Check if user exists in our database
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          if (!existingUser) {
            // Create new user in our database
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || null,
                image: user.image || null,
                provider: "google",
              },
            })
          } else if (existingUser.provider !== "google") {
            // Update provider if user exists with different provider
            await prisma.user.update({
              where: { email: user.email },
              data: { 
                provider: "google",
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            })
          }
          // Set the user ID to match our database
          user.id = existingUser.id
        }
        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
