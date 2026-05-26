import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "productId is required" },
        { status: 400 }
      );
    }

    // Atomic increment using Supabase RPC
    const { error } = await supabaseAdmin.rpc("increment_view_count", {
      row_id: Number(productId),
    });

    if (error) {
      console.error("[track-view] RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to track view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "View tracked" }, { status: 200 });
  } catch (error) {
    console.error("[track-view] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to track view" },
      { status: 500 }
    );
  }
}
