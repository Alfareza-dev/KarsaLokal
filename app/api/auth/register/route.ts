import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { generateOTP, sendOTPEmail } from '@/lib/mailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/register
 * Register a new user with email, password, full_name, and whatsapp_number.
 * Hashes password with bcrypt, generates 6-digit OTP, and sends it via email.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, full_name, whatsapp_number } = body

    // ── Input Validation ────────────────────────────────────────────────────
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, dan nama wajib diisi.' },
        { status: 400 }
      )
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // ── Check existing email ────────────────────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, is_verified')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      if (existing.is_verified) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar. Silakan login.' },
          { status: 409 }
        )
      }

      // User exists but not verified — resend OTP
      const otpCode = generateOTP()
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      // Update password hash (in case they changed it) and new OTP
      const passwordHash = await bcrypt.hash(password, 12)

      await supabaseAdmin
        .from('profiles')
        .update({
          password_hash: passwordHash,
          full_name: full_name.trim(),
          whatsapp_number: whatsapp_number?.trim() || null,
          otp_code: otpCode,
          otp_expires_at: otpExpiresAt,
          otp_cooldown_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      // Fetch store config for email branding
      const { storeName, themeColor } = await getStoreBranding()

      await sendOTPEmail(email, otpCode, storeName, themeColor)

      return NextResponse.json({
        success: true,
        message: 'Kode OTP telah dikirim ulang ke email kamu.',
      })
    }

    // ── Hash Password ───────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)

    // ── Generate OTP ────────────────────────────────────────────────────────
    const otpCode = generateOTP()
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    // ── Insert to Database ──────────────────────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        whatsapp_number: whatsapp_number?.trim() || null,
        role: 'user',
        is_verified: false,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_cooldown_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[Register] DB insert error:', insertError)
      return NextResponse.json(
        { error: 'Gagal membuat akun. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    // ── Send OTP Email ──────────────────────────────────────────────────────
    const { storeName, themeColor } = await getStoreBranding()

    try {
      await sendOTPEmail(email, otpCode, storeName, themeColor)
    } catch (mailErr) {
      console.error('[Register] Email send error:', mailErr)
      // Don't fail registration if email fails — user can resend
    }

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil dibuat! Kode OTP dikirim ke email kamu.',
    })
  } catch (err: unknown) {
    console.error('[Register] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────
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
