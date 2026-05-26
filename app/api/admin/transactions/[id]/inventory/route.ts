import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hasAdminAccess = await isAdmin();
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // Fetch the inventory item linked to this order
    const { data: inventoryItem, error } = await supabaseAdmin
      .from('inventory')
      .select('id, content_data')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "Results contain 0 rows, single() requires exactly 1 row"
      console.error("[Transaction Inventory] Fetch error:", error);
      return NextResponse.json({ error: 'Failed to fetch inventory data' }, { status: 500 });
    }

    return NextResponse.json({ 
      inventory: inventoryItem || null 
    });

  } catch (err) {
    console.error("[Transaction Inventory] Unexpected error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
