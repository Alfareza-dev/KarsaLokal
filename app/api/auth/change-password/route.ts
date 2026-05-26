import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { SESSION_COOKIE_NAME } from '@/lib/session'
import bcrypt from 'bcryptjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/change-password
 * Change password for the currently authenticated user.
 * Requires a valid JWT session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const session = token ? verifyToken(token) : null

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { new_password } = body

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 12)

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ password_hash })
      .eq('id', session.userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Change Password] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
