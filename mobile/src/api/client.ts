/**
 * src/api/client — the one HTTP path to /api/v1.
 * ===========================================================================
 * Adds the Bearer header, parses the {ok,data}/{ok,error} envelope, and on a
 * 401 performs a SINGLE-FLIGHT refresh (concurrent 401s share one refresh
 * call) then retries once. A failed refresh clears the session and notifies
 * the auth context (onSessionExpired) so the UI drops to logged-out browse.
 */
import Constants from 'expo-constants'
import { getTokens, setTokens, clearTokens } from '@/auth/tokenStore'

const API_BASE: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'https://queryandbuy.com'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn
}

let refreshInFlight: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const tokens = await getTokens()
  if (!tokens?.refreshToken) return false
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
    const body = (await res.json()) as Envelope<{ accessToken: string; refreshToken: string }>
    if (!res.ok || !body.ok) return false
    await setTokens({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken })
    return true
  } catch {
    return false
  }
}

/** Refresh once even when many requests 401 simultaneously. */
function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Skip the auth header entirely (public reads). */
  anonymous?: boolean
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const exec = async (): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (!opts.anonymous) {
      const tokens = await getTokens()
      if (tokens?.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`
    }
    if (opts.body !== undefined) headers['content-type'] = 'application/json'
    return fetch(`${API_BASE}/api/v1${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  }

  let res = await exec()
  if (res.status === 401 && !opts.anonymous) {
    const refreshed = await refreshOnce()
    if (refreshed) {
      res = await exec()
    } else {
      await clearTokens()
      onSessionExpired?.()
    }
  }

  const body = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!body) throw new ApiError('server_error', 'Unexpected server response.', res.status)
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, res.status)
  return body.data
}

export { API_BASE }
