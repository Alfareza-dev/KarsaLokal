import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateOTP, sendOTPEmail } from '@/lib/mailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/resend-otp
 * Resend OTP with 60-second cooldown rate limiting.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, purpose } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email wajib diisi.' },
        { status: 400 }
      )
    }

    // ── Find user ───────────────────────────────────────────────────────────
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_verified, otp_cooldown_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (findError || !profile) {
      // Generic success response — don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, kode OTP baru telah dikirim.',
      })
    }

    // Only block verified users if purpose is NOT password reset
    if (profile.is_verified && purpose !== 'reset-password') {
      return NextResponse.json(
        { error: 'Akun sudah terverifikasi. Silakan login.' },
        { status: 400 }
      )
    }

    // ── Rate limit check (60-second cooldown) ───────────────────────────────
    if (profile.otp_cooldown_at) {
      const cooldownEnd = new Date(profile.otp_cooldown_at).getTime() + 60 * 1000
      const now = Date.now()

      if (now < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - now) / 1000)
        return NextResponse.json(
          { error: `Tunggu ${remaining} detik sebelum mengirim ulang OTP.`, cooldown: remaining },
          { status: 429 }
        )
      }
    }

    // ── Generate new OTP ────────────────────────────────────────────────────
    const otpCode = generateOTP()
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('profiles')
      .update({
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_cooldown_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    // ── Send email ──────────────────────────────────────────────────────────
    try {
      const { storeName, themeColor } = await getStoreBranding()
      await sendOTPEmail(email, otpCode, storeName, themeColor)
    } catch (mailErr) {
      console.error('[Resend OTP] Email send error:', mailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Kode OTP baru telah dikirim ke email kamu.',
    })
  } catch (err: unknown) {
    console.error('[Resend OTP] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}

async function getStoreBranding(): Promise<{ storeName: string; themeColor: string }> {
  try {
    const { data } = await supabaseAdmin
      .from('store_configs')
      .select('name, theme_color')
      .eq('id', 1)
      .single()
    return {
      storeName: data?.name || 'Myuchielle',
      themeColor: data?.theme_color || '#F472B6',
    }
  } catch {
    return { storeName: 'Myuchielle', themeColor: '#F472B6' }
  }
}
