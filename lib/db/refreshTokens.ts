/**
 * lib/db/refreshTokens — refresh-token rows for the mobile token flow
 * (lib/api/tokens.ts). Pure persistence; rotation/reuse policy lives in the
 * token module, not here.
 */
import { db } from '@/lib/db'

export type RefreshTokenRow = {
  id: string
  userId: string
  expiresAt: Date
  revokedAt: Date | null
}

export async function insertRefreshToken(input: {
  userId: string
  tokenHash: string
  expiresAt: Date
  rotatedFromId: string | null
}): Promise<void> {
  await db.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      rotatedFromId: input.rotatedFromId,
    },
  })
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  const row = await db.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  })
  return row
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await db.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } })
}

/** Revoke every live token for a user (refresh-reuse theft response; account deletion). */
export async function revokeAllRefreshTokensFor(userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
