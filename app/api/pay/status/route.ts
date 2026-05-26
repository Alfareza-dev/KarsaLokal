import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const LOUVIN_API_URL = "https://api.louvin.dev";
const LOUVIN_API_KEY = process.env.LOUVIN_API_KEY!;

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/pay/status?id=LOUVIN_TRANSACTION_ID
 * Checks payment status via Louvin API.
 * On settlement: updates order status + marks one inventory item as sold.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("id");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID wajib diisi." },
        { status: 400 }
      );
    }

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

    // Check status via Louvin API
    const louvinRes = await fetch(
      `${LOUVIN_API_URL}/check-status?id=${transactionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LOUVIN_API_KEY,
        },
      }
    );

    const louvinData = await louvinRes.json();

    if (!louvinRes.ok || !louvinData.success) {
      console.error("[Pay Status] Louvin error:", louvinData);
      return NextResponse.json(
        { error: louvinData.error || "Gagal cek status pembayaran." },
        { status: louvinRes.status || 500 }
      );
    }

    const newStatus = louvinData.transaction.status; // 'pending' | 'settled' | 'failed'

    // Fetch the current order from our database
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, status, product_id")
      .eq("louvin_transaction_id", transactionId)
      .eq("user_id", user.id)
      .single();

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    // If status changed from pending to settled/failed, update our database
    if (existingOrder.status === "pending" && newStatus !== "pending") {
      // Update order status
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", existingOrder.id);

      // If settled: mark one inventory item as sold using service role
      if (newStatus === "settled" && existingOrder.product_id) {
        // Find one unsold inventory item for this product
        const { data: inventoryItem } = await supabase
          .from("inventory")
          .select("id")
          .eq("product_id", existingOrder.product_id)
          .eq("is_sold", false)
          .limit(1)
          .single();

        if (inventoryItem) {
          await supabase
            .from("inventory")
            .update({
              is_sold: true,
              sold_at: new Date().toISOString(),
              order_id: existingOrder.id,
            })
            .eq("id", inventoryItem.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: louvinData.transaction.id,
        status: newStatus,
        amount: louvinData.transaction.amount,
        fee: louvinData.transaction.fee,
        net_amount: louvinData.transaction.net_amount,
      },
    });
  } catch (err: any) {
    console.error("[Pay Status] Unexpected error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server: " + (err?.message || String(err)) },
      { status: 500 }
    );
  }
}
