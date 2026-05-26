import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/inventory-stock?product_id=X  or  ?product_ids=1,2,3
 * Returns available stock counts. No auth required (public).
 * Does NOT expose content_data — only counts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get("product_id");
  const multiIds = searchParams.get("product_ids");

  const supabase = await createClient();

  if (singleId) {
    const { data, error } = await supabase
      .from("inventory_stock")
      .select("available_stock")
      .eq("product_id", parseInt(singleId))
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found", which means 0 stock
      console.error("[Stock API] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ [singleId]: data?.available_stock ?? 0 });
  }

  if (multiIds) {
    const ids = multiIds.split(",").map((id) => parseInt(id.trim())).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    // Fetch all available stock for these products
    const { data, error } = await supabase
      .from("inventory_stock")
      .select("product_id, available_stock")
      .in("product_id", ids);

    if (error) {
      console.error("[Stock API] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map counts per product
    const counts: Record<string, number> = {};
    for (const id of ids) {
      counts[id.toString()] = 0;
    }
    for (const row of data || []) {
      counts[row.product_id.toString()] = row.available_stock;
    }

    return NextResponse.json(counts);
  }

  return NextResponse.json({ error: "product_id or product_ids parameter required" }, { status: 400 });
}
