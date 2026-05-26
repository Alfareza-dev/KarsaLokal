import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, channel } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "productId is required" },
        { status: 400 }
      );
    }

    // Atomic increment using Supabase RPC
    const { error } = await supabaseAdmin.rpc("increment_order_click_count", {
      row_id: Number(productId),
    });

    if (error) {
      console.error("[track-order-click] RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to track order click" },
        { status: 500 }
      );
    }

    console.log(`[track-order-click] Product ${productId} clicked via ${channel || "unknown"}`);

    return NextResponse.json({ success: true, message: "Order click tracked" }, { status: 200 });
  } catch (error) {
    console.error("[track-order-click] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to track order click" },
      { status: 500 }
    );
  }
}
