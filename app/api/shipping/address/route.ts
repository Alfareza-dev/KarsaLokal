import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ address: null });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ address: null });
    }

    const { data: address } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', payload.userId)
      .single();

    return NextResponse.json({ address });
  } catch (err) {
    console.error('Error fetching address:', err);
    return NextResponse.json({ address: null });
  }
}
