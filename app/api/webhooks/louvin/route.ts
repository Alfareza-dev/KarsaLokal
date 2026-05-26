import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Pastikan event adalah payment.settled
    if (payload.event !== 'payment.settled') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { order_id, customer_name, customer_email, transaction_id } = payload.data || {};

    if (!order_id) {
      console.error('Webhook Error: Missing order_id in payload');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 1. Update status orders menjadi settled
    // Menggunakan reference_id untuk mencocokkan payload order_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'settled', louvin_transaction_id: transaction_id })
      .eq('reference_id', order_id)
      .select('id, product_id, user_id, quantity, shipping_method, status')
      .single();

    if (orderError || !order) {
      console.error('Webhook Error: Order not found or update failed', orderError);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 2. Decrement physical stock (best effort)
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

    // 3. Get Store config for emails
    const { data: storeConfig } = await supabaseAdmin
      .from('store_configs')
      .select('name, theme_color, brand_emoji, contact_whatsapp, admin_wa_number, email_template')
      .eq('id', 1)
      .single();

    const senderEmail = process.env.SMTP_USER || 'noreply@myuchielle.com';
    const storeName = storeConfig?.name || 'Myuchielle';
    const waNumber = storeConfig?.contact_whatsapp || storeConfig?.admin_wa_number || '';
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=Halo%20Admin,%20saya%20ingin%20mengambil/menanyakan%20pesanan%20dengan%20ID%20Transaksi:%20${transaction_id || order_id}` : '';

    const isDelivery = order.shipping_method === 'delivery';
    
    // Construct Email HTML
    const emailHtml = `
<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; color: #09090B;">
  <div style="background-color: #F8FAFC; padding: 24px; text-align: center; border-bottom: 1px solid #E5E7EB;">
    <h2 style="color: #09090B; margin: 0; font-size: 24px; font-weight: 800;">Terima Kasih atas Pesanan Anda! 🎉</h2>
  </div>
  <div style="padding: 32px;">
    <p>Halo <strong style="color: #09090B;">${customer_name || 'Pelanggan'}</strong>,</p>
    <p style="color: #52525B;">Pembayaran Anda untuk Order ID <strong style="color: #09090B;">${order_id}</strong> telah berhasil kami verifikasi.</p>
    
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

    try {
      await sendEmail({
        from: `"${storeName}" <${senderEmail}>`,
        to: customer_email,
        subject: `[${storeName}] Pesanan Diproses - ${order_id}`,
        html: emailHtml,
      });
      console.log(`Success sending fulfillment email to ${customer_email}`);
    } catch (err) {
      console.error('Failed to send fulfillment email', err);
    }

    // Harus selalu me-return HTTP 200 agar Louvin tidak mengirim ulang notifikasi
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook handler failed:', error);
    // Return HTTP 200 walaupun error untuk mencegah loop dari Louvin
    return NextResponse.json({ received: true, error: error.message }, { status: 200 });
  }
}
