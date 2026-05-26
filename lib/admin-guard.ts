import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyToken } from './jwt'
import { SESSION_COOKIE_NAME } from './session'
import { cookies } from 'next/headers'

// Service role client untuk operasi admin (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Helper: Cek apakah user yang sedang login adalah admin.
 * Membaca JWT dari HttpOnly cookie, verifikasi, dan cek role dari database.
 * Digunakan di dalam API Route handlers.
 */
export async function requireAdmin(): Promise<{ isAdmin: true; userId: string } | { isAdmin: false; response: NextResponse }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return {
      isAdmin: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return {
      isAdmin: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Double-check role from database (defense-in-depth)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', payload.userId)
    .single()

  if (!profile || profile.role !== 'admin') {
    return {
      isAdmin: false,
      response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    }
  }

  return { isAdmin: true, userId: payload.userId }
}

export { supabaseAdmin }
