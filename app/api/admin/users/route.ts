import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: get current user from session cookie
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

// Helper: check admin
async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
  if (profile?.role !== 'admin') return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, userId };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Query all profiles directly (no more auth.admin.listUsers)
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, whatsapp_number, role, created_at, last_login_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (profiles || []).map(p => ({
    id: p.id,
    email: p.email || '',
    created_at: p.created_at,
    last_login_at: p.last_login_at,
    role: p.role || 'user',
    full_name: p.full_name || '',
    whatsapp_number: p.whatsapp_number || '',
  }));

  // Sort: admins first
  users.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, role } = await request.json();
  if (!id || !role) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  if (id === auth.userId && role !== 'admin') return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });

  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Role updated successfully" });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  if (id === auth.userId) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  // Bypass: Force delete user by first deleting their orders to satisfy foreign key constraints.
  // Warning: This will permanently remove financial records associated with this user.
  const { error: deleteOrdersError } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('user_id', id);

  if (deleteOrdersError) {
    return NextResponse.json({ error: "Gagal menghapus pesanan pengguna: " + deleteOrdersError.message }, { status: 500 });
  }

  // Then delete from auth (which cascades to profiles) or directly from profiles
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    // Fallback: try deleting from profiles directly if auth.admin fails or is restricted
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: "User deleted successfully" });
}
