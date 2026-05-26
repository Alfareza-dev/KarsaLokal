-- ============================================================
-- MIGRATION: Add email_template to store_configs
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add email_template column to store_configs
ALTER TABLE store_configs
  ADD COLUMN IF NOT EXISTS email_template text DEFAULT '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
  <div style="background-color: {theme_color}; padding: 20px; text-align: center;">
    <h2 style="color: white; margin: 0;">Terima Kasih atas Pesanan Anda! {brand_emoji}</h2>
  </div>
  <div style="padding: 24px;">
    <p>Halo <strong>{customer_name}</strong>,</p>
    <p>Pembayaran Anda untuk Order ID <strong>{order_id}</strong> telah berhasil kami verifikasi.</p>
    <p>Berikut adalah detail produk pesanan Anda:</p>
    <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Detail Akun / Lisensi:</h3>
      <pre style="background: #2d3748; color: #f7fafc; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>{content_data}</code></pre>
    </div>
    <p>Jika ada pertanyaan lebih lanjut, jangan ragu untuk menghubungi kami.</p>
    <p>Salam hangat,<br><strong>{store_name}</strong></p>
  </div>
</div>
';

-- Update the existing row to use the default template if it is null
UPDATE store_configs 
SET email_template = '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
  <div style="background-color: {theme_color}; padding: 20px; text-align: center;">
    <h2 style="color: white; margin: 0;">Terima Kasih atas Pesanan Anda! {brand_emoji}</h2>
  </div>
  <div style="padding: 24px;">
    <p>Halo <strong>{customer_name}</strong>,</p>
    <p>Pembayaran Anda untuk Order ID <strong>{order_id}</strong> telah berhasil kami verifikasi.</p>
    <p>Berikut adalah detail produk pesanan Anda:</p>
    <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Detail Akun / Lisensi:</h3>
      <pre style="background: #2d3748; color: #f7fafc; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>{content_data}</code></pre>
    </div>
    <p>Jika ada pertanyaan lebih lanjut, jangan ragu untuk menghubungi kami.</p>
    <p>Salam hangat,<br><strong>{store_name}</strong></p>
  </div>
</div>
' 
WHERE email_template IS NULL;
