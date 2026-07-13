/**
 * lib/api/session — build the TokenPair payload (@qb/shared TokenPairSchema)
 * returned by every /api/v1/auth endpoint that establishes a session.
 */
import { issueTokens } from '@/lib/api/tokens'
import { profileById } from '@/lib/db/profiles'
import { loadViewerIfActive } from '@/lib/db/viewer'

export type TokenPairPayload = {
  accessToken: string
  accessExpiresAt: string
  refreshToken: string
  user: {
    id: string
    email: string | null
    displayName: string
    username: string | null
    avatarUrl: string | null
  }
}

/**
 * The user card alone (refresh flow, where tokens were already rotated).
 * Null when the account is deleted/banned.
 */
export async function establishUserCard(userId: string): Promise<TokenPairPayload['user'] | null> {
  const viewer = await loadViewerIfActive(userId)
  if (!viewer) return null
  const profile = await profileById(userId)
  return {
    id: userId,
    email: viewer.email,
    displayName: profile?.display_name ?? viewer.email?.split('@')[0] ?? 'User',
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

/**
 * Issue tokens + the user card for a (verified) user id. Returns null when the
 * account is deleted/banned — callers turn that into a 401/403 envelope.
 */
export async function establishSession(userId: string): Promise<TokenPairPayload | null> {
  const user = await establishUserCard(userId)
  if (!user) return null
  const tokens = await issueTokens(userId)
  return { ...tokens, user }
}
