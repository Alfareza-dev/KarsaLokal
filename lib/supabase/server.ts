import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase server client for database operations.
 * NO AUTH cookie management — auth is handled by custom JWT.
 * Uses service role key for server-side DB queries.
 */
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
