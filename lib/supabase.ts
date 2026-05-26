import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client untuk operasi standard (Public / Authenticated user)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client khusus untuk operasi Admin / server-side yang butuh bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
