/**
 * lib/api/respond — the /api/v1 response envelope.
 * ===========================================================================
 * Every endpoint returns `{ ok: true, data }` or `{ ok: false, error }` so the
 * mobile client has ONE parsing path. Error codes are stable strings the app
 * can switch on; messages are human-readable and safe to show users.
 */
import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'rate_limited'
  | 'blocked_content'
  | 'conflict'
  | 'server_error'

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(code: ApiErrorCode, message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, ...extra } }, { status })
}

export const unauthorized = () => fail('unauthorized', 'Sign in to continue.', 401)
export const forbidden = () => fail('forbidden', 'You do not have access to this.', 403)
export const notFound = (what = 'Resource') => fail('not_found', `${what} not found.`, 404)
export const serverError = () => fail('server_error', 'Something went wrong. Try again.', 500)
export const rateLimited = (retryAfterSec: number) =>
  fail('rate_limited', 'Too many requests — slow down.', 429, { retryAfterSec })

/**
 * Wrap a handler body: known envelopes pass through, thrown errors become a
 * 500 envelope (never a Next.js error page — mobile always gets JSON).
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e) {
    console.error('[api/v1]', e)
    return serverError()
  }
}
