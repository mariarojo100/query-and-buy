/**
 * lib/api/tokens — access/refresh token issuance for the mobile /api/v1 flow.
 * ===========================================================================
 * Independent of Auth.js (which stays the web browser flow): mobile clients
 * hold a short-lived HS256 access JWT (API_JWT_SECRET) plus a long-lived
 * opaque refresh token. Refresh tokens rotate on every use — only the sha256
 * hash is stored (refresh_tokens table), and presenting an already-rotated
 * token is treated as theft: the whole chain for that user is revoked.
 *
 * Boundary note: this module touches the raw client via lib/db and therefore
 * lives OUTSIDE lib/db — DB access goes through the small repo functions in
 * lib/db/refreshTokens.ts (allowlisted like other system repos).
 */
import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import {
  insertRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllRefreshTokensFor,
} from '@/lib/db/refreshTokens'

const ACCESS_TTL_SEC = 60 * 60 // 1h
const REFRESH_TTL_SEC = 60 * 24 * 60 * 60 // 60d
const ISSUER = 'queryandbuy'
const AUDIENCE = 'qb-mobile'

function secret(): Uint8Array {
  const s = process.env.API_JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error('API_JWT_SECRET is not set (32+ chars required); see .env.example.')
  }
  return new TextEncoder().encode(s)
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export type IssuedTokens = {
  accessToken: string
  accessExpiresAt: string
  refreshToken: string
}

/** Issue a fresh access+refresh pair (login, signup, oauth, refresh rotation). */
export async function issueTokens(userId: string, rotatedFromId?: string): Promise<IssuedTokens> {
  const now = Math.floor(Date.now() / 1000)
  const accessToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SEC)
    .sign(secret())

  const refreshRaw = randomBytes(48).toString('base64url')
  await insertRefreshToken({
    userId,
    tokenHash: hashRefreshToken(refreshRaw),
    expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    rotatedFromId: rotatedFromId ?? null,
  })

  return {
    accessToken,
    accessExpiresAt: new Date((now + ACCESS_TTL_SEC) * 1000).toISOString(),
    refreshToken: refreshRaw,
  }
}

/** Verify an access JWT; returns the user id or null (expired/invalid/wrong audience). */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE })
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

export type RotationResult =
  | { ok: true; userId: string; tokens: IssuedTokens }
  | { ok: false; reason: 'invalid' | 'expired' | 'reused' }

/**
 * Rotate a refresh token: revoke the presented one, issue a new pair.
 * Reuse of a token that was already rotated/revoked revokes EVERY live token
 * for that user (the thief and the victim both re-authenticate).
 */
export async function rotateRefreshToken(presentedRaw: string): Promise<RotationResult> {
  const row = await findRefreshTokenByHash(hashRefreshToken(presentedRaw))
  if (!row) return { ok: false, reason: 'invalid' }
  if (row.revokedAt) {
    await revokeAllRefreshTokensFor(row.userId)
    return { ok: false, reason: 'reused' }
  }
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' }

  await revokeRefreshToken(row.id)
  const tokens = await issueTokens(row.userId, row.id)
  return { ok: true, userId: row.userId, tokens }
}

/** Revoke one refresh token (logout of this device). No-op if unknown. */
export async function revokeByRaw(presentedRaw: string): Promise<void> {
  const row = await findRefreshTokenByHash(hashRefreshToken(presentedRaw))
  if (row && !row.revokedAt) await revokeRefreshToken(row.id)
}
