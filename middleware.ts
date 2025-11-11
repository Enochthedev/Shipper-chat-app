import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isChatPage = req.nextUrl.pathname.startsWith("/chat")

  // Redirect to login if trying to access chat without auth
  if (isChatPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // Redirect to chat if authenticated and on auth page
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
