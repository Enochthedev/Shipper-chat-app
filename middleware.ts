import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isChatPage = req.nextUrl.pathname.startsWith("/chat")
  
  // Check for session token in cookies
  const sessionToken = req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token")
  const isAuthenticated = !!sessionToken

  // Redirect to login if trying to access chat without auth
  if (isChatPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // Redirect to chat if authenticated and on auth page
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
