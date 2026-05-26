import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { SESSION_COOKIE_NAME } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/auth/me
 * Returns the current authenticated user data.
 * Used by client-side components to check auth status.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ user: null })
    }

    // Fetch fresh profile data from DB
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, whatsapp_number, role')
      .eq('id', payload.userId)
      .single()

    if (!profile) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        whatsapp_number: profile.whatsapp_number,
        role: profile.role,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
