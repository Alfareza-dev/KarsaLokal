import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, type JWTPayload } from './jwt'

export const SESSION_COOKIE_NAME = 'myuchielle_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// ─── For API Routes (setting cookie on response) ──────────────────────────────

/**
 * Set the session JWT as HttpOnly cookie on a NextResponse.
 */
export function setSessionCookie(req: NextRequest, response: NextResponse, token: string): void {
  const isSecure = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

/**
 * Clear the session cookie on a NextResponse.
 */
export function clearSessionCookieOnResponse(req: NextRequest, response: NextResponse): void {
  const isSecure = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

// ─── For Server Components / Server Actions ───────────────────────────────────

/**
 * Read session from cookie store (Server Components & Server Actions).
 * Returns decoded JWT payload or null.
 */
export async function getSessionFromCookieStore(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Clear the session cookie from server action context.
 */
export async function clearSessionFromCookieStore(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// ─── For Middleware (reading from request) ────────────────────────────────────

/**
 * Read raw session token from NextRequest cookies.
 * Does NOT verify — middleware uses jose for edge-compatible verification.
 */
export function getSessionTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null
}
