import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * OAuth (Google) redirect handler — PKCE code exchange.
 *
 * Supabase returns here with `?code=...` after the provider authenticates the
 * user. We exchange it for a session and MUST write the resulting auth cookies
 * onto the exact response we return. Using the next/headers server client here
 * does NOT reliably attach Set-Cookie to a manually-built NextResponse.redirect
 * — which is why the session was lost and the user bounced back to /login.
 * Email-confirmation links use /auth/confirm separately.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') ? nextParam : '/' // same-origin only
  const oauthError = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const loginRedirect = (message: string) =>
    NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(message)}`, origin))

  // Provider-side failure (GoTrue ↔ Google). Log the raw cause for diagnosis,
  // but NEVER show the raw Supabase/GoTrue text to the user (req 9). A provider
  // error here (e.g. "Unable to exchange external code") is a dashboard config
  // issue — wrong/empty Google Client Secret or a redirect-URI mismatch.
  if (oauthError) {
    logger.error('auth.callback', 'oauth provider error', {
      error: oauthError,
      description: errorDescription,
    })
    const friendly =
      oauthError === 'access_denied'
        ? 'Google sign-in was cancelled.'
        : 'We couldn’t sign you in with Google. Please try again or use email.'
    return loginRedirect(friendly)
  }
  if (!code) {
    return loginRedirect('We couldn’t sign you in with Google. Please try again or use email.')
  }

  // Build the success redirect first so the Supabase client can write the
  // session cookies directly onto it.
  const response = NextResponse.redirect(new URL(next, origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    logger.error('auth.callback', 'exchangeCodeForSession failed', { reason: error.message })
    return loginRedirect('We couldn’t complete your Google sign-in. Please try again.')
  }

  // The user is now authenticated and the session cookies are on `response`.
  // Ensure a profile exists (idempotent self-heal) for first-time users — but a
  // failure here must NEVER drop the session or bounce to /login (reqs 5 & 6).
  // The DB trigger already provisions the profile on signup; this is a safety
  // net. Wrapped so a throw can't prevent returning the authenticated redirect.
  try {
    const { error: profileError } = await supabase.rpc('ensure_self_profile')
    if (profileError) {
      logger.error('auth.callback', 'ensure_self_profile returned error (session kept)', {
        reason: profileError.message,
      })
    }
  } catch (e) {
    logger.error('auth.callback', 'ensure_self_profile threw (session kept)', {
      reason: e instanceof Error ? e.message : 'unknown',
    })
  }

  // Always return the authenticated response: cookies persist, middleware sees
  // the user, and the homepage renders the signed-in state immediately.
  return response
}
