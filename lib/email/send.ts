import { createServiceClient } from '@/utils/supabase/admin'

const FROM = process.env.EMAIL_FROM ?? 'Query & Buy <onboarding@resend.dev>'
const MAX_ATTEMPTS = 3

type SendOpts = {
  to: string | null | undefined
  subject: string
  html: string
  template?: string
  payload?: unknown
}

/**
 * Send a transactional email via Resend (REST, no SDK dependency).
 * Centralized + reliable: never throws, retries transient failures (429/5xx),
 * emits structured logs, and records permanent failures to email_failures for
 * future retry. Email must NEVER fail a transaction.
 */
export async function sendEmail(
  opts: SendOpts,
): Promise<{ sent: boolean; skipped?: boolean; attempts?: number }> {
  const key = process.env.RESEND_API_KEY
  if (!key || !opts.to) {
    log('skipped', opts, { reason: key ? 'no_recipient' : 'no_api_key' })
    return { sent: false, skipped: true }
  }

  let lastError = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
      })
      if (res.ok) {
        log('sent', opts, { attempt })
        return { sent: true, attempts: attempt }
      }
      const detail = await res.text().catch(() => '')
      lastError = `Resend ${res.status}: ${detail.slice(0, 240)}`
      // Retry only transient failures; client errors (4xx except 429) are permanent.
      if (res.status !== 429 && res.status < 500) break
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'unknown error'
    }
    if (attempt < MAX_ATTEMPTS) await delay(200 * attempt)
  }

  log('failed', opts, { error: lastError })
  await recordFailure(opts, lastError)
  return { sent: false }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(status: 'sent' | 'skipped' | 'failed', opts: SendOpts, extra: Record<string, unknown>) {
  const line = JSON.stringify({
    evt: 'email',
    status,
    template: opts.template ?? null,
    to: opts.to ?? null,
    ...extra,
  })
  if (status === 'failed') console.error(line)
  else console.log(line)
}

async function recordFailure(opts: SendOpts, error: string) {
  try {
    const admin = createServiceClient()
    await admin.from('email_failures').insert({
      to_email: opts.to ?? null,
      template: opts.template ?? null,
      error,
      payload: (opts.payload ?? null) as never,
    })
  } catch {
    /* logging must never throw */
  }
}
