/**
 * lib/api/idTokens — verify Google / Apple id_tokens presented by the mobile
 * app (POST /api/v1/auth/{google,apple}).
 * ===========================================================================
 * The device obtains an id_token natively (expo-auth-session /
 * expo-apple-authentication); the server verifies signature + issuer +
 * audience against the provider's JWKS and returns a normalized identity for
 * lib/auth/oauth.ts#resolveOAuthUser. JWKS sets are cached per runtime by jose.
 *
 * Audiences:
 *   Google — AUTH_GOOGLE_ID (web) plus GOOGLE_MOBILE_CLIENT_IDS (comma-sep;
 *            iOS and Android OAuth clients have their own ids).
 *   Apple  — APPLE_BUNDLE_ID (the iOS app's bundle identifier).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { OAuthIdentity } from '@/lib/auth/oauth'

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

function googleAudiences(): string[] {
  const ids = [
    process.env.AUTH_GOOGLE_ID,
    ...(process.env.GOOGLE_MOBILE_CLIENT_IDS ?? '').split(','),
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s)
  return ids
}

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthIdentity | null> {
  const audiences = googleAudiences()
  if (audiences.length === 0) return null
  try {
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: audiences,
    })
    if (typeof payload.sub !== 'string') return null
    return {
      provider: 'google',
      providerAccountId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
      avatarUrl: typeof payload.picture === 'string' ? payload.picture : null,
    }
  } catch {
    return null
  }
}

export async function verifyAppleIdToken(idToken: string): Promise<OAuthIdentity | null> {
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim()
  if (!bundleId) return null
  try {
    const { payload } = await jwtVerify(idToken, appleJwks, {
      issuer: 'https://appleid.apple.com',
      audience: bundleId,
    })
    if (typeof payload.sub !== 'string') return null
    return {
      provider: 'apple',
      providerAccountId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      // Apple's email_verified may arrive as boolean or the string "true".
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: null, // Apple sends the name only in the first authorization response, not the token.
      avatarUrl: null,
    }
  } catch {
    return null
  }
}
