import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser-side database operations.
 * NO AUTH — only for reading public data (products, categories, etc.)
 * Uses anon key with RLS policies.
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Backward-compatible alias
export { createBrowserClient as createClient }
