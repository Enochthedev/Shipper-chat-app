import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import jwt from "jsonwebtoken"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create JWT token for WebSocket authentication
    const token = jwt.sign(
      { 
        id: session.user.id, 
        email: session.user.email 
      },
      secret,
      { expiresIn: "24h" }
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Error generating socket token:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
