import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { signToken } from '@/lib/jwt'
import { setSessionCookie } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/login
 * Authenticate user with email + password.
 * Sets JWT session in HttpOnly cookie on success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      )
    }

    // ── Find user by email ──────────────────────────────────────────────────
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, password_hash, full_name, whatsapp_number, role, is_verified')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (findError || !profile) {
      return NextResponse.json(
        { error: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    // ── Verify password ─────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, profile.password_hash)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    // ── Check verification status ───────────────────────────────────────────
    if (!profile.is_verified) {
      return NextResponse.json(
        { 
          error: 'Email belum diverifikasi. Cek inbox kamu untuk kode OTP! ',
          needVerification: true,
          email: profile.email,
        },
        { status: 403 }
      )
    }

    // ── Generate JWT Token ──────────────────────────────────────────────────
    const token = signToken({
      userId: profile.id,
      email: profile.email,
      role: profile.role || 'user',
    })

    // ── Update last login (non-blocking) ────────────────────────────────────
    supabaseAdmin
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(({ error }) => {
        if (error) console.error('[Login] Failed to update last_login_at:', error)
      })

    // ── Set HttpOnly Cookie ─────────────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    })

    setSessionCookie(req, response, token)

    return response
  } catch (err: unknown) {
    console.error('[Login] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
