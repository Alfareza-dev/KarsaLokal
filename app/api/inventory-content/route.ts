import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/inventory-content?order_id=123
 * Fetches the delivered product content for a settled order.
 * Only the order owner can access this.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "order_id wajib diisi." }, { status: 400 });
    }

    // Verify user is authenticated via custom JWT
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = { id: session.userId };

    // Verify order ownership
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, status")
      .eq("id", parseInt(orderId, 10))
      .single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
    }

    if (order.status !== "settled") {
      return NextResponse.json({ error: "Order belum settled." }, { status: 400 });
    }

    // Fetch inventory content
    const { data: inventory } = await supabase
      .from("inventory")
      .select("content_data")
      .eq("order_id", order.id)
      .limit(1)
      .single();

    return NextResponse.json({
      content_data: inventory?.content_data || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Inventory Content] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
