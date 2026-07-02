/**
 * Centralized structured logger. Emits one JSON line per event so logs are
 * machine-parseable in production. Sensitive keys are redacted so we never leak
 * credentials, tokens, emails, or phone numbers into logs.
 *
 * Swap the sink (e.g. ship to Sentry/Datadog) by replacing `emit`.
 */
type Level = 'debug' | 'info' | 'warn' | 'error' | 'security' | 'audit'

const SENSITIVE = /(pass|token|secret|key|authorization|cookie|email|phone|otp)/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3 || value == null) return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? '[redacted]' : redact(v, depth + 1)
    }
    return out
  }
  return value
}

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'security') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (scope: string, message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', scope, message, meta)
  },
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('error', scope, message, meta),
  /** Security-relevant events: auth failures, rate-limit hits, blocked content. */
  security: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('security', scope, message, meta),
  /** Audit trail: who did what (admin actions, state changes). */
  audit: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('audit', scope, message, meta),
}
