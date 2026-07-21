/**
 * Unit tests for lib/sms/twilio-verify — Twilio Verify status mapping.
 * `fetch` is stubbed so nothing leaves the process; no real Twilio, no DB.
 */
import { ok, summary, exitCode } from '@/tests/unit/_harness'

type FetchReturn = { ok: boolean; status: number; body?: unknown }
let nextResponse: FetchReturn = { ok: true, status: 200 }
let lastUrl = ''

// Stub global fetch before importing the module under test.
globalThis.fetch = (async (url: string) => {
  lastUrl = String(url)
  return {
    ok: nextResponse.ok,
    status: nextResponse.status,
    json: async () => nextResponse.body ?? {},
    text: async () => JSON.stringify(nextResponse.body ?? {}),
  }
}) as unknown as typeof fetch

const mod = await import('@/lib/sms/twilio-verify')

async function run() {
  // --- not configured (no env) ---
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_AUTH_TOKEN
  delete process.env.TWILIO_VERIFY_SERVICE_SID
  ok('isPhoneVerifyConfigured false without env', mod.isPhoneVerifyConfigured() === false)
  ok('start → not_configured without env', (await mod.startVerification('+971501234567')).ok === false)
  const chk0 = await mod.checkVerification('+971501234567', '123456')
  ok('check → not_configured without env', !chk0.approved && chk0.reason === 'not_configured')

  // --- configured ---
  process.env.TWILIO_ACCOUNT_SID = 'AC_test'
  process.env.TWILIO_AUTH_TOKEN = 'tok_test'
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VA_test'
  ok('isPhoneVerifyConfigured true with env', mod.isPhoneVerifyConfigured() === true)

  nextResponse = { ok: true, status: 201 }
  ok('start ok on 2xx', (await mod.startVerification('+971501234567')).ok === true)
  ok('start hits Verifications endpoint', lastUrl.endsWith('/VA_test/Verifications'))

  nextResponse = { ok: false, status: 429 }
  const rl = await mod.startVerification('+971501234567')
  ok('start 429 → rate_limited', !rl.ok && rl.reason === 'rate_limited')

  nextResponse = { ok: false, status: 400 }
  const bad = await mod.startVerification('+971501234567')
  ok('start 400 → invalid_number', !bad.ok && bad.reason === 'invalid_number')

  nextResponse = { ok: true, status: 200, body: { status: 'approved' } }
  ok('check approved when status=approved', (await mod.checkVerification('+971501234567', '123456')).approved === true)

  nextResponse = { ok: true, status: 200, body: { status: 'pending' } }
  const wrong = await mod.checkVerification('+971501234567', '000000')
  ok('check pending → incorrect', !wrong.approved && wrong.reason === 'incorrect')

  nextResponse = { ok: false, status: 404 }
  const exp = await mod.checkVerification('+971501234567', '123456')
  ok('check 404 → expired', !exp.approved && exp.reason === 'expired')

  summary('twilio-verify')
  process.exit(exitCode())
}

run()
