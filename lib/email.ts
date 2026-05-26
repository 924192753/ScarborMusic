import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    })
  } else {
    // Development fallback: log emails to console instead of sending them
    transporter = nodemailer.createTransport({ jsonTransport: true })
    console.warn('[Email] SMTP not configured — emails will be logged to console only')
  }

  return transporter
}

const FROM_ADDRESS = process.env.SMTP_FROM ?? 'ScarborMusic <noreply@scarbormusic.com>'

// ─── Email Templates ──────────────────────────────────────────────────────────

function verificationCodeHtml(code: string, type: 'register' | 'reset_password'): string {
  const action = type === 'register' ? 'complete your registration' : 'reset your password'
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ScarborMusic Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#1a1a2e;border-radius:12px;padding:40px;text-align:center;">
        <h1 style="color:#a78bfa;font-size:28px;margin:0 0 8px;">ScarborMusic</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Discover &amp; Share Music</p>
        <p style="color:#e5e7eb;font-size:16px;margin:0 0 24px;">
          Your verification code to ${action}:
        </p>
        <div style="background:#2d2d4e;border-radius:8px;padding:20px 32px;display:inline-block;margin:0 0 24px;">
          <span style="color:#a78bfa;font-size:36px;font-weight:700;letter-spacing:12px;">${code}</span>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:0;">
          This code expires in <strong style="color:#e5e7eb;">5 minutes</strong>.
          Do not share this code with anyone.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center;">
        <p style="color:#6b7280;font-size:12px;margin:0;">
          If you didn't request this code, please ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendVerificationCode(
  email: string,
  code: string,
  type: 'register' | 'reset_password' = 'register',
): Promise<void> {
  const t = getTransporter()
  const subject =
    type === 'register' ? 'Your ScarborMusic verification code' : 'Reset your ScarborMusic password'

  const info = await t.sendMail({
    from: FROM_ADDRESS,
    to: email,
    subject,
    html: verificationCodeHtml(code, type),
    text: `Your ScarborMusic verification code is: ${code}\nThis code expires in 5 minutes.`,
  })

  // In development with jsonTransport, log the email body
  if (process.env.NODE_ENV === 'development' && 'message' in info) {
    const parsed = JSON.parse((info as { message: string }).message)
    console.warn(`[Email] To: ${email} | Subject: ${subject} | Code: ${code}`)
    console.warn('[Email] Preview:', JSON.stringify(parsed.text ?? ''))
  }
}
