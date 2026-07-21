/**
 * lib/email/auth-emails — transactional emails Auth.js needs (Phase 3 wiring).
 * ===========================================================================
 * Supabase Auth used to send these; now we send them via the existing Resend
 * helper (lib/email/send.ts). Best-effort — sendEmail never throws.
 */
import { sendEmail } from '@/lib/email/send'
import { SITE_URL, SITE_NAME } from '@/lib/site'

function shell(title: string, body: string, cta: { href: string; label: string }): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="font-size:14px;line-height:1.5;color:#444">${body}</p>
    <p style="margin:24px 0">
      <a href="${cta.href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">${cta.label}</a>
    </p>
    <p style="font-size:12px;color:#888">If the button doesn't work, paste this link into your browser:<br>${cta.href}</p>
    <p style="font-size:12px;color:#888">— ${SITE_NAME}</p>
  </div>`
}

export function sendVerificationEmail(to: string, rawToken: string) {
  const href = `${SITE_URL}/verify-email?token=${encodeURIComponent(rawToken)}`
  return sendEmail({
    to,
    subject: `Confirm your email — ${SITE_NAME}`,
    template: 'email_verify',
    html: shell('Confirm your email', 'Tap below to verify your email address. This link expires in 24 hours.', {
      href,
      label: 'Confirm email',
    }),
  })
}

export function sendPasswordResetEmail(to: string, rawToken: string) {
  const href = `${SITE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`
  return sendEmail({
    to,
    subject: `Reset your password — ${SITE_NAME}`,
    template: 'password_reset',
    html: shell('Reset your password', 'Tap below to choose a new password. This link expires in 1 hour. If you didn’t request this, ignore this email.', {
      href,
      label: 'Reset password',
    }),
  })
}
