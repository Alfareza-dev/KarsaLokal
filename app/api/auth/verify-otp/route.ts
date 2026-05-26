import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code sent to user's email during registration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email dan kode OTP wajib diisi.' },
        { status: 400 }
      )
    }

    // ── Find user by email ──────────────────────────────────────────────────
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, otp_code, otp_expires_at, is_verified')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (findError || !profile) {
      // Generic error — don't reveal if email exists or not
      return NextResponse.json(
        { error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' },
        { status: 400 }
      )
    }

    // ── Already verified ────────────────────────────────────────────────────
    if (profile.is_verified) {
      return NextResponse.json(
        { error: 'Akun sudah terverifikasi. Silakan login.' },
        { status: 400 }
      )
    }

    // ── Check OTP match ─────────────────────────────────────────────────────
    if (profile.otp_code !== otp.trim()) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' },
        { status: 400 }
      )
    }

    // ── Check OTP expiry ────────────────────────────────────────────────────
    if (!profile.otp_expires_at || new Date(profile.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' },
        { status: 400 }
      )
    }

    // ── Mark as verified & clear OTP ────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_verified: true,
        otp_code: null,
        otp_expires_at: null,
        otp_cooldown_at: null,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[Verify OTP] Update error:', updateError)
      return NextResponse.json(
        { error: 'Gagal memverifikasi akun. Coba lagi.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil diverifikasi! Silakan login.',
    })
  } catch (err: unknown) {
    console.error('[Verify OTP] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
