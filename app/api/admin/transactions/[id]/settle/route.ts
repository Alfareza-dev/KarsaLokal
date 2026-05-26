import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';
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

    let shouldSendEmail = true;
    try {
      const body = await req.json();
      if (typeof body.sendEmail === 'boolean') {
        shouldSendEmail = body.sendEmail;
      }
    } catch (e) {
      // Ignore if no body is provided
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // 2. Fetch Order Data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, product_id, user_id, amount, status, reference_id, product_name, payment_method, shipping_method, quantity')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'settled') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 400 });
    }
    
    // Check shipping method
    const isDelivery = order.shipping_method === 'delivery';

    // Ambil email dari profiles table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', order.user_id)
      .single();
    const customerEmail = userProfile?.email;

    // Ambil data customer untuk nama
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    const customerName = profile?.full_name || 'Pelanggan';

    if (!customerEmail) {
      console.warn(`[Settle] Email not found for user ${order.user_id}. Proceeding without email notification.`);
    }

    // 3. Update Order Status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'settled' })
      .eq('id', order.id);

    if (updateError) {
      throw updateError;
    }

    // 4. Decrement physical stock
    const quantityToFulfill = order.quantity || 1;
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock')
      .eq('id', order.product_id)
      .single();
      
    if (product) {
      const newStock = Math.max(0, (product.stock || 0) - quantityToFulfill);
      await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', order.product_id);
    }

    // 5. Send Email
    const { data: storeConfig } = await supabaseAdmin
      .from('store_configs')
      .select('name, theme_color, brand_emoji, contact_whatsapp, admin_wa_number, email_template')
      .eq('id', 1)
      .single();

    const senderEmail = process.env.SMTP_USER || 'noreply@myuchielle.com';
    const storeName = storeConfig?.name || 'Myuchielle';
    const waNumber = storeConfig?.contact_whatsapp || storeConfig?.admin_wa_number || '';
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=Halo%20Admin,%20saya%20ingin%20mengambil/menanyakan%20pesanan%20dengan%20ID%20Transaksi:%20${order.reference_id || order.id}` : '';

    const emailHtml = `
<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; color: #09090B;">
  <div style="background-color: #F8FAFC; padding: 24px; text-align: center; border-bottom: 1px solid #E5E7EB;">
    <h2 style="color: #09090B; margin: 0; font-size: 24px; font-weight: 800;">Terima Kasih atas Pesanan Anda! 🎉</h2>
  </div>
  <div style="padding: 32px;">
    <p>Halo <strong style="color: #09090B;">${customerName}</strong>,</p>
    <p style="color: #52525B;">Pembayaran Anda untuk Order ID <strong style="color: #09090B;">${order.reference_id || order.id}</strong> telah berhasil kami verifikasi.</p>
    
    <div style="background-color: #F8FAFC; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #E5E7EB;">
      <h3 style="margin-top: 0; color: #09090B; font-size: 16px;">Status Pengiriman:</h3>
      ${isDelivery ? 
        `<p style="margin-bottom: 0; color: #52525B; line-height: 1.6;">Pesanan fisik Anda sedang kami proses dan masuk antrean <strong>Packing</strong>. Nomor resi pengiriman akan kami informasikan segera setelah barang diserahkan ke kurir.</p>` 
      : `<p style="margin-bottom: 0; color: #52525B; line-height: 1.6;">Pesanan Anda menggunakan metode <strong>Pickup / Ambil Sendiri</strong>. Produk Anda sudah masuk antrean persiapan. Mohon hubungi Admin kami melalui WhatsApp untuk mengatur jadwal pengambilan di lokasi.</p>`
      }
    </div>
    
    ${!isDelivery && waLink ? `<div style="text-align: center; margin-top: 24px;"><a href="${waLink}" style="display: inline-block; background-color: #09090B; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">Hubungi Admin via WhatsApp</a></div>` : ''}
    
    <p style="color: #52525B; margin-top: 32px;">Jika ada pertanyaan lebih lanjut, jangan ragu untuk membalas email ini.</p>
    <p style="color: #52525B;">Salam hangat,<br><strong style="color: #09090B;">${storeName}</strong></p>
  </div>
</div>
`;

    if (shouldSendEmail && customerEmail) {
      try {
        await sendEmail({
          from: `"${storeName}" <${senderEmail}>`,
          to: customerEmail,
          subject: `[${storeName}] Pesanan Diproses - ${order.reference_id || order.id}`,
          html: emailHtml,
        });
      } catch (err) {
        console.error('Failed to send fulfillment email', err);
      }
    } else {
      console.warn('Skipping email notification because customerEmail is undefined or shouldSendEmail is false');
    }

    return NextResponse.json({ success: true, message: 'Order manually settled and fulfilled.' }, { status: 200 });

  } catch (error: any) {
    console.error('Manual settle failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
