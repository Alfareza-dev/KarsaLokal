import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ exists: false }, { status: 400 })
    }

    // Query profiles table directly (no more auth.admin.listUsers)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('is_verified', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true })
  } catch (err) {
    console.error('[check-email] Unexpected error:', err)
    return NextResponse.json({ exists: true }) // fail-open
  }
}
