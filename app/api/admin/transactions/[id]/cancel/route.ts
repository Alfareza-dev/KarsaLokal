import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validasi Akses Admin
    const hasAdminAccess = await isAdmin();
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // 2. Fetch Order Data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'settled') {
      return NextResponse.json({ error: 'Order is already settled, cannot be cancelled.' }, { status: 400 });
    }

    // 3. Update Order Status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Order manually cancelled.' }, { status: 200 });

  } catch (error: any) {
    console.error('Manual cancel failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
