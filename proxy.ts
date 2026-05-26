import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { SESSION_COOKIE_NAME } from '@/lib/session'

/**
 * Next.js 16 Proxy (formerly middleware).
 * Handles authentication and route protection using custom JWT sessions.
 * Runs on Node.js runtime (not edge).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // ── Verify session ──────────────────────────────────────────────────────
  const session = token ? verifyToken(token) : null

  // ── Admin routes protection ─────────────────────────────────────────────
  // /admin/* (except /admin/login) requires admin session
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // ── Dashboard routes protection ─────────────────────────────────────────
  // /dashboard/* requires any authenticated session
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // ── Auth page redirects (already logged in) ─────────────────────────────
  // If user is already logged in, redirect away from auth pages
  if (session) {
    if (pathname === '/auth/login' || pathname === '/auth/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname === '/admin/login') {
      if (session.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
