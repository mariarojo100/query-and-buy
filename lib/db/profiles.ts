/**
 * lib/db/profiles — Viewer-scoped profile writes (Phase 4).
 * ===========================================================================
 * Replaces profiles_owner_write RLS + the guard_phone_verified trigger with an
 * explicit COLUMN ALLOWLIST: these functions can only ever write display_name,
 * username, bio, emirate, avatar_url. There is no code path here to set
 * verified flags, rating, trust_score, badge_level, reports_count, etc. — those
 * are written only by trusted server flows (auth verification, counters). A
 * user updating their profile therefore cannot escalate their own trust.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'
import type { Emirate } from '@/lib/generated/prisma/enums'

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'
}

export type UpdateProfileResult = { ok: true } | { ok: false; error: 'username_taken' }

export async function updateProfileFor(
  viewer: Viewer,
  input: { displayName: string; username: string; bio: string | null; emirate: string | null },
): Promise<UpdateProfileResult> {
  try {
    await db.profile.update({
      where: { id: viewer.id },
      data: {
        displayName: input.displayName,
        username: input.username,
        bio: input.bio,
        emirate: (input.emirate ?? null) as Emirate | null,
      },
    })
    return { ok: true }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: 'username_taken' }
    throw e
  }
}

export async function updateAvatarFor(viewer: Viewer, avatarUrl: string): Promise<void> {
  await db.profile.update({ where: { id: viewer.id }, data: { avatarUrl } })
}

/** Free if nobody holds `username`, or the current viewer already holds it. */
export async function usernameAvailable(username: string, viewerId: string | null): Promise<boolean> {
  const existing = await db.profile.findUnique({ where: { username }, select: { id: true } })
  if (!existing) return true
  return viewerId != null && existing.id === viewerId
}
