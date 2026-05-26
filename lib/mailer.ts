import nodemailer from 'nodemailer'

// ─── Transporter Factory ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ─── OTP Email Sender ─────────────────────────────────────────────────────────

/**
 * Kirim email OTP 6 digit dengan template HTML estetik.
 * Warna tema diambil dari konfigurasi toko.
 */
export async function sendOTPEmail(
  to: string,
  otpCode: string,
  storeName: string = 'Myuchielle',
  themeColor: string = '#F472B6'
): Promise<void> {
  // Generate darker shade for hover-like effect
  const darkerColor = adjustBrightness(themeColor, -30)

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:460px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e4e7;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#09090B; padding:32px 24px; text-align:center;">
              <h1 style="margin:0; color:#FAFAFA; font-size:22px; font-weight:800; letter-spacing:-0.5px;">
                ${storeName}
              </h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.7); font-size:13px;">
                Verifikasi Akun Kamu
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px; color:#3f3f46; font-size:15px; line-height:1.6;">
                Hai! <br>
                Masukkan kode verifikasi berikut untuk mengaktifkan akun kamu:
              </p>

              <!-- OTP Code -->
              <div style="background-color:#fafafa; border:2px dashed #d4d4d8; border-radius:12px; padding:24px; text-align:center; margin:24px 0;">
                <span style="font-size:36px; font-weight:900; letter-spacing:12px; color:#09090B; font-family:'Courier New',monospace;">
                  ${otpCode}
                </span>
              </div>

              <p style="margin:0 0 8px; color:#71717a; font-size:13px; line-height:1.5;">
                Kode ini berlaku selama <strong>5 menit</strong>.
              </p>
              <p style="margin:0; color:#71717a; font-size:13px; line-height:1.5;">
                Jangan bagikan kode ini kepada siapapun demi keamanan akun kamu.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa; padding:20px 28px; border-top:1px solid #e4e4e7; text-align:center;">
              <p style="margin:0; color:#a1a1aa; font-size:11px;">
                &copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.
              </p>
              <p style="margin:4px 0 0; color:#d4d4d8; font-size:11px;">
                Jika kamu tidak mendaftar, abaikan email ini.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
    to,
    subject: ` Kode Verifikasi ${storeName} — ${otpCode}`,
    html,
  })
}

// ─── Generic Email Sender ─────────────────────────────────────────────────────

/**
 * Send any HTML email via Nodemailer.
 * Used for transactional emails (order fulfillment, notifications, etc.)
 */
export async function sendEmail(options: {
  from: string
  to: string
  subject: string
  html: string
}): Promise<void> {
  await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simple hex color brightness adjuster.
 * Negative amount = darker, positive = lighter.
 */
function adjustBrightness(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * Generate 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
