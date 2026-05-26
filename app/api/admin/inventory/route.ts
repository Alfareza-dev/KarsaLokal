import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/admin-guard";

/**
 * GET /api/admin/inventory?product_id=X&filter=available|sold|all
 * Fetch inventory items for a specific product.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return auth.response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  const filter = searchParams.get("filter") || "all"; // available | sold | all

  if (!productId) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("inventory")
    .select("id, product_id, content_data, is_sold, sold_at, order_id, created_at")
    .eq("product_id", parseInt(productId))
    .order("created_at", { ascending: false });

  if (filter === "available") {
    query = query.eq("is_sold", false);
  } else if (filter === "sold") {
    query = query.eq("is_sold", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Inventory API] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count summary
  const available = (data || []).filter((i) => !i.is_sold).length;
  const sold = (data || []).filter((i) => i.is_sold).length;

  // For the full list, re-fetch if filter was applied (count needs all)
  let totalAvailable = available;
  let totalSold = sold;
  if (filter !== "all") {
    const { count: avCount } = await supabaseAdmin
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("product_id", parseInt(productId))
      .eq("is_sold", false);
    const { count: slCount } = await supabaseAdmin
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("product_id", parseInt(productId))
      .eq("is_sold", true);
    totalAvailable = avCount ?? 0;
    totalSold = slCount ?? 0;
  }

  return NextResponse.json({
    items: data || [],
    summary: { available: filter === "all" ? available : totalAvailable, sold: filter === "all" ? sold : totalSold },
  });
}

/**
 * POST /api/admin/inventory
 * Bulk insert inventory items.
 * Body: { product_id: number, items: { content_data: string }[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return auth.response;

  try {
    const body = await req.json();
    const { product_id, items } = body;

    if (!product_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "product_id and non-empty items array are required" },
        { status: 400 }
      );
    }

    // Validate each item has content_data
    const validItems = items
      .filter((i: any) => typeof i.content_data === "string" && i.content_data.trim().length > 0)
      .map((i: any) => ({
        product_id: parseInt(product_id),
        content_data: i.content_data.trim(),
        is_sold: false,
      }));

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data valid. Pastikan setiap baris memiliki content_data yang tidak kosong." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("inventory")
      .insert(validItems)
      .select("id");

    if (error) {
      console.error("[Inventory API] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      message: `${data?.length || 0} item berhasil ditambahkan ke inventory.`,
    });
  } catch (err: any) {
    console.error("[Inventory API] POST unexpected error:", err);
    return NextResponse.json({ error: "Server error: " + (err?.message || String(err)) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/inventory
 * Delete unsold inventory items.
 * Body: { ids: number[] }
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return auth.response;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    // Only delete unsold items for safety
    const { data, error } = await supabaseAdmin
      .from("inventory")
      .delete()
      .in("id", ids)
      .eq("is_sold", false)
      .select("id");

    if (error) {
      console.error("[Inventory API] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
      message: `${data?.length || 0} item berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error("[Inventory API] DELETE unexpected error:", err);
    return NextResponse.json({ error: "Server error: " + (err?.message || String(err)) }, { status: 500 });
  }
}
