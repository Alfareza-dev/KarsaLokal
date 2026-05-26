import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookieOnResponse, SESSION_COOKIE_NAME } from '@/lib/session'
import { BRANDING_COOKIE_KEY } from '@/lib/store'

/**
 * POST /api/auth/logout
 * Clear session cookie and branding cookie.
 */
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })

  // Clear session cookie
  clearSessionCookieOnResponse(req, response)

  // Clear branding cookie
  response.cookies.set(BRANDING_COOKIE_KEY, '', {
    httpOnly: false,
    path: '/',
    maxAge: 0,
  })

  return response
}
