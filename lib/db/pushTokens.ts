/**
 * lib/db/pushTokens — Expo push-token registry (mobile).
 * A token is unique per device; re-registering moves it to the current user
 * (device changed accounts). lib/notifications/push.ts reads these to send.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'

export async function registerPushTokenFor(
  viewer: Viewer,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await db.pushToken.upsert({
    where: { token },
    create: { userId: viewer.id, token, platform },
    update: { userId: viewer.id, platform, lastSeenAt: new Date() },
  })
}

export async function unregisterPushToken(viewer: Viewer, token: string): Promise<void> {
  // Only the owning user's registration is removed (token may have moved).
  await db.pushToken.deleteMany({ where: { token, userId: viewer.id } })
}

export async function pushTokensForUser(userId: string): Promise<string[]> {
  const rows = await db.pushToken.findMany({ where: { userId }, select: { token: true } })
  return rows.map((r) => r.token)
}

/** Prune tokens Expo reported as DeviceNotRegistered. */
export async function deletePushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return
  await db.pushToken.deleteMany({ where: { token: { in: tokens } } })
}
