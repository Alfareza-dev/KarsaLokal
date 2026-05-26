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
 * POST /api/pay/cancel
 * Cancels a pending order. Only the order owner can cancel.
 * Sets order status to "cancelled".
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated via custom JWT
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? verifyToken(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = { id: session.userId };

    // 2. Parse request body
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "order_id wajib diisi." },
        { status: 400 }
      );
    }

    // 3. Fetch the order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, status, product_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: "Kamu tidak memiliki akses ke order ini." },
        { status: 403 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: `Order tidak bisa dibatalkan (status: ${order.status}).` },
        { status: 400 }
      );
    }

    // 4. Update order status to cancelled
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    if (updateError) {
      console.error("[Pay Cancel] Update error:", updateError);
      return NextResponse.json(
        { error: "Gagal membatalkan pesanan: " + updateError.message },
        { status: 500 }
      );
    }

    // 5. Fetch product slug for redirect
    let productSlug = "";
    if (order.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("slug")
        .eq("id", order.product_id)
        .single();
      productSlug = product?.slug || "";
    }

    return NextResponse.json({
      success: true,
      product_slug: productSlug,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Pay Cancel] Unexpected error:", message);
    return NextResponse.json(
      { error: "Terjadi kesalahan server: " + message },
      { status: 500 }
    );
  }
}
