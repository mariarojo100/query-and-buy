/**
 * tests/api/_harness — helpers for the /api/v1 integration suite.
 * ===========================================================================
 * Reuses the authz harness (reset/seed/assert) and adds HTTP-shaped helpers:
 * route handlers are plain functions, so tests import them and invoke with
 * constructed Request objects — a real end-to-end pass through bearer auth,
 * zod validation, the service layer, and the repositories against a REAL
 * Postgres (DATABASE_URL). Requires API_JWT_SECRET in the environment.
 */
import { issueTokens } from '@/lib/api/tokens'

export { ok, summary, exitCode, resetDb, makeUser } from '../authz/_harness'

const BASE = 'http://api.test'

/** Access token for a user id (the same issuance path as /auth/login). */
export async function accessTokenFor(userId: string): Promise<string> {
  const t = await issueTokens(userId)
  return t.accessToken
}

/** Build a Request the way the mobile client sends it. */
export function apiRequest(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Request {
  const headers: Record<string, string> = {}
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  return new Request(`${BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

export type Envelope = {
  ok: boolean
  data?: Record<string, unknown>
  error?: { code: string; message: string }
}

/** Parse a handler's Response into { status, envelope }. */
export async function read(res: Response): Promise<{ status: number; body: Envelope }> {
  return { status: res.status, body: (await res.json()) as Envelope }
}
