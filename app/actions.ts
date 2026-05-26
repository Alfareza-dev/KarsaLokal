'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BRANDING_COOKIE_KEY, type BrandingCookie } from '@/lib/store'
import { SESSION_COOKIE_NAME } from '@/lib/session'
import { getSessionFromCookieStore } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Revalidation ─────────────────────────────────────────────────────────────
export async function revalidateStoreConfig() {
  revalidatePath('/', 'layout')
}

// ─── Branding Cookie Actions ──────────────────────────────────────────────────

/**
 * Simpan data branding minimal ke cookie untuk akses instan.
 * HttpOnly: false → dapat dibaca client jika diperlukan di masa depan.
 * Secure hanya di produksi (bukan data sensitif, hanya branding).
 */
export async function setBrandingCookie(branding: BrandingCookie) {
  const cookieStore = await cookies()
  cookieStore.set(BRANDING_COOKIE_KEY, JSON.stringify(branding), {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: false,            // Boleh dibaca JS client jika perlu
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

/**
 * Hapus cookie branding saat logout.
 */
export async function clearBrandingCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(BRANDING_COOKIE_KEY)
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────

/**
 * Sign out and redirect to homepage.
 * Clears custom session cookie and branding cookie.
 */
export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete(BRANDING_COOKIE_KEY)
  redirect('/')
}

/**
 * Update user profile (full_name, whatsapp_number).
 * Reads user from custom JWT session.
 */
export async function updateProfile(formData: FormData) {
  const session = await getSessionFromCookieStore()

  if (!session) {
    return { error: 'Not authenticated' }
  }

  const fullName = formData.get('full_name') as string
  const whatsappNumber = formData.get('whatsapp_number') as string

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      whatsapp_number: whatsappNumber,
    })
    .eq('id', session.userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
