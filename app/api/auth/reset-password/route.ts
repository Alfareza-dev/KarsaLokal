import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/reset-password
 * Verify OTP and set a new password (for unauthenticated forgot-password flow).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, otp, new_password } = body

    if (!email || !otp || !new_password) {
      return NextResponse.json(
        { error: 'Email, OTP, dan password baru wajib diisi.' },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, otp_code, otp_expires_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (findError || !profile) {
      return NextResponse.json(
        { error: 'Akun tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Verify OTP
    if (!profile.otp_code || profile.otp_code !== otp) {
      return NextResponse.json(
        { error: 'Kode OTP salah.' },
        { status: 400 }
      )
    }

    // Check expiry
    if (profile.otp_expires_at && new Date(profile.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 12)

    // Update password and clear OTP
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash,
        otp_code: null,
        otp_expires_at: null,
      })
      .eq('id', profile.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal mengubah password.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah! Silakan login.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Reset Password] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
