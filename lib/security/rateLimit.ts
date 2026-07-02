import { logger } from '@/lib/logger'

/**
 * Best-effort in-memory fixed-window rate limiter.
 *
 * IMPORTANT: this is per-server-instance and resets on cold start, so on
 * serverless (Vercel) it bounds bursts against a warm instance but is NOT a
 * globally-consistent limiter. It is a cheap first line of defence for
 * cost-sensitive AI endpoints. For production-grade, multi-instance limiting
 * move this to Upstash Redis / @upstash/ratelimit (tracked in
 * PRODUCTION_READINESS.md). Fails OPEN — a limiter bug must never block users.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSec: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  try {
    const now = Date.now()
    sweep(now)
    const b = buckets.get(key)
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
    }
    if (b.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
    }
    b.count += 1
    return { allowed: true, remaining: limit - b.count, retryAfterSec: 0 }
  } catch {
    // Fail open.
    return { allowed: true, remaining: limit, retryAfterSec: 0 }
  }
}

/** Convenience: enforce a limit and log when exceeded. Returns true if allowed. */
export function enforceRateLimit(scope: string, key: string, limit: number, windowMs: number): RateLimitResult {
  const res = rateLimit(`${scope}:${key}`, limit, windowMs)
  if (!res.allowed) {
    logger.security('rate_limit', 'request blocked by rate limit', { scope, key, limit, windowMs })
  }
  return res
}
