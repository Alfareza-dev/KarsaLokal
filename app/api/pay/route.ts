import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const LOUVIN_API_URL = "https://api.louvin.dev";
const LOUVIN_API_KEY = process.env.LOUVIN_API_KEY!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_PAYMENT_TYPES = [
  "qris",
  "gopay",
  "shopeepay",
  "bni_va",
  "bri_va",
  "permata_va",
  "cimb_niaga_va",
];

/**
 * POST /api/pay
 * Secure server-side proxy for creating Louvin transactions.
 * - Validates auth session via custom JWT
 * - Looks up product price (with flash sale check)
 * - Creates Louvin transaction
 * - Logs order to database
 * - Returns payment data to frontend
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify user is authenticated via custom JWT
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? verifyToken(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: "Kamu harus login terlebih dahulu." },
        { status: 401 }
      );
    }

    const user = { id: session.userId, email: session.email };

    // 2. Parse request body
    const body = await req.json();
    const { 
      product_id, 
      payment_type, 
      quantity = 1,
      shipping_method = "delivery",
      shipping_cost = 0,
      courier_name = null,
      courier_code = null 
    } = body;

    if (!product_id || !payment_type) {
      return NextResponse.json(
        { error: "product_id dan payment_type wajib diisi." },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Kuantitas minimal adalah 1." },
        { status: 400 }
      );
    }

    if (!VALID_PAYMENT_TYPES.includes(payment_type)) {
      return NextResponse.json(
        { error: `payment_type tidak valid: ${payment_type}` },
        { status: 400 }
      );
    }

    // 3. Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, current_price, slug")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    // 4. Check for active flash sale
    const now = new Date().toISOString();
    const { data: flashSale } = await supabase
      .from("flash_sales")
      .select("sale_price")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .lte("start_at", now)
      .gte("end_at", now)
      .single();

    const finalPrice = flashSale ? flashSale.sale_price : product.current_price;

    // 5. Check inventory stock (gateway mode requires real stock)
    const { data: stockData } = await supabase
      .from("inventory_stock")
      .select("available_stock")
      .eq("product_id", product.id)
      .single();

    if (!stockData || stockData.available_stock < quantity) {
      return NextResponse.json(
        { error: `Maaf, sisa stok produk ini tidak mencukupi. (Sisa: ${stockData?.available_stock || 0})` },
        { status: 400 }
      );
    }

    // 5b. SPAM GUARD: Check for existing pending order for same product
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, expired_at, status")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingOrder) {
      const isExpired = existingOrder.expired_at
        ? new Date(existingOrder.expired_at).getTime() < Date.now()
        : false;

      if (!isExpired) {
        // Still valid — return specific error structure instead of silent redirect
        return NextResponse.json({
          success: false,
          pending_order_id: existingOrder.id,
          error: "Anda masih memiliki pesanan yang belum dibayar.",
        });
      } else {
        // Expired — mark as failed so user can create a new one
        await supabase
          .from("orders")
          .update({ status: "failed" })
          .eq("id", existingOrder.id);
      }
    }

    // 6. Get user profile for customer info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // 7. Create transaction via Louvin API
    const fallbackName = profile?.full_name || "Pelanggan Myuchielle";
    const finalCustomerName = (fallbackName && fallbackName.trim().length > 0) ? fallbackName : "Pelanggan Myuchielle";
    const finalCustomerEmail = (user.email && user.email.trim().length > 0) ? user.email : "customer@myuchielle.com";

    const totalProductPrice = finalPrice * quantity;
    const finalAmount = totalProductPrice + (shipping_method === "delivery" ? Number(shipping_cost) : 0);

    const louvinPayload = {
      amount: finalAmount,
      payment_type,
      customer_name: finalCustomerName,
      customer_email: finalCustomerEmail,
      description: `Pembelian ${product.name} (x${quantity})`,
      return_url: `${req.headers.get('origin') || 'https://myuchielle.com'}/dashboard`
    };

    const louvinRes = await fetch(`${LOUVIN_API_URL}/create-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LOUVIN_API_KEY,
      },
      body: JSON.stringify(louvinPayload),
    });

    const louvinData = await louvinRes.json();

    if (!louvinRes.ok || !louvinData.success) {
      console.error("[Pay API] Louvin error:", louvinData);
      return NextResponse.json(
        {
          error: louvinData.error || "Gagal membuat transaksi pembayaran.",
          details: louvinData.details || null,
        },
        { status: louvinRes.status || 500 }
      );
    }

    // 8. Save order to database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        amount: louvinData.transaction.amount, // total including fee
        quantity: quantity,
        status: "pending",
        reference_id: louvinData.transaction.reference,
        payment_method: payment_type,
        louvin_transaction_id: louvinData.transaction.id,
        expired_at: louvinData.payment.expired_at,
        qr_string: louvinData.payment.qr_string || null,
        va_number: louvinData.payment.va_number || null,
        bank: louvinData.payment.bank || null,
        shipping_method: shipping_method,
        shipping_cost: shipping_cost,
        courier_name: courier_name,
        courier_code: courier_code,
        shipping_status: shipping_method === "delivery" ? "pending" : null
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[Pay API] Order insert error:", orderError);
      return NextResponse.json(
        { error: "Gagal menyimpan pesanan: " + orderError.message },
        { status: 500 }
      );
    }

    // 9. Return payment data to frontend
    return NextResponse.json({
      success: true,
      order_id: order.id,
      transaction: {
        id: louvinData.transaction.id,
        amount: louvinData.transaction.amount,
        fee: louvinData.transaction.fee,
        net_amount: louvinData.transaction.net_amount,
        status: louvinData.transaction.status,
      },
      payment: {
        payment_type: louvinData.payment.payment_type,
        qr_string: louvinData.payment.qr_string || null,
        va_number: louvinData.payment.va_number || null,
        bank: louvinData.payment.bank || null,
        payment_number: louvinData.payment.payment_number || null,
        deeplink_url: louvinData.payment.deeplink_url || null,
        expired_at: louvinData.payment.expired_at,
        total_payment: louvinData.payment.total_payment,
      },
    });
  } catch (err: any) {
    console.error("[Pay API] Unexpected error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server: " + (err?.message || String(err)) },
      { status: 500 }
    );
  }
}
