/**
 * lib/api/rateLimit — per-endpoint limits for /api/v1.
 * ===========================================================================
 * Thin wrapper over lib/security/rateLimit.ts (in-memory fixed window,
 * fails open). Keyed on viewer id when authenticated, else best-effort
 * client IP. Production hardening (Redis/Upstash) swaps the inner call only.
 */
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { rateLimited } from '@/lib/api/respond'
import type { NextResponse } from 'next/server'
import type { Viewer } from '@/lib/authz/viewer'

function clientKey(req: Request, viewer: Viewer | null): string {
  if (viewer) return viewer.id
  // The site sits behind Cloudflare, which sets CF-Connecting-IP to the real
  // client IP and cannot be spoofed by the client (unlike the leftmost, fully
  // client-controlled X-Forwarded-For value). Prefer it; fall back to the
  // RIGHTMOST XFF hop (added by the trusted proxy) rather than the leftmost.
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const hops = fwd.split(',').map((s) => s.trim()).filter(Boolean)
    return hops[hops.length - 1] || 'anon'
  }
  return 'anon'
}

/**
 * Returns a 429 envelope response when over the limit, else null.
 * Usage: `const limited = apiRateLimit(req, viewer, 'send-message', 30); if (limited) return limited`
 */
export function apiRateLimit(
  req: Request,
  viewer: Viewer | null,
  scope: string,
  limit: number,
  windowMs = 60_000,
): NextResponse | null {
  const res = enforceRateLimit(`api:${scope}`, clientKey(req, viewer), limit, windowMs)
  return res.allowed ? null : rateLimited(res.retryAfterSec)
}
