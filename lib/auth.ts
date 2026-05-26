import { getSessionFromCookieStore } from './session'
import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  whatsapp_number: string | null
  role: 'user' | 'admin'
}

/**
 * Get current authenticated user with their profile data.
 * Reads session from HttpOnly cookie, verifies JWT, and fetches profile from DB.
 * Returns null if not authenticated.
 * Server-side only (Server Components, Server Actions).
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const session = await getSessionFromCookieStore()
  if (!session) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, whatsapp_number, role')
    .eq('id', session.userId)
    .single()

  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email || session.email,
    full_name: profile.full_name || null,
    whatsapp_number: profile.whatsapp_number || null,
    role: profile.role || 'user',
  }
})

/**
 * Check if current user is an admin.
 * Server-side only.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}
