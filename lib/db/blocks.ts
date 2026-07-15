/**
 * lib/db/blocks — user blocking (App Store UGC requirement).
 * A block is one-directional (blocker → blocked) but conversation effects are
 * mutual: messaging enforcement lives in lib/db/messaging.ts, which excludes
 * conversations where EITHER side blocked the other.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'

export async function blockUserFor(
  viewer: Viewer,
  blockedId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (blockedId === viewer.id) return { ok: false, error: "You can't block yourself." }
  const exists = await db.user.findUnique({ where: { id: blockedId }, select: { id: true } })
  if (!exists) return { ok: false, error: 'User not found.' }
  await db.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: viewer.id, blockedId } },
    create: { blockerId: viewer.id, blockedId },
    update: {},
  })
  return { ok: true }
}

export async function unblockUserFor(viewer: Viewer, blockedId: string): Promise<void> {
  await db.blockedUser.deleteMany({ where: { blockerId: viewer.id, blockedId } })
}

/** Is there a block in EITHER direction between the two users? */
export async function blockExistsBetween(a: string, b: string): Promise<boolean> {
  const row = await db.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  })
  return row != null
}

/** Ids this viewer has blocked or been blocked by (for feed/inbox filtering). */
export async function blockedIdsFor(viewer: Viewer): Promise<Set<string>> {
  const rows = await db.blockedUser.findMany({
    where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] },
    select: { blockerId: true, blockedId: true },
  })
  const set = new Set<string>()
  for (const r of rows) set.add(r.blockerId === viewer.id ? r.blockedId : r.blockerId)
  return set
}
