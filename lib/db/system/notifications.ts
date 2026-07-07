/**
 * lib/db/system/notifications — privileged notification writes/reads (Phase 4).
 * The target-stack replacement for the notifications_owner (service-role) insert
 * path used by dispatch. System repo: importable only from the allowlist.
 */
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'

export async function insertNotification(input: {
  userId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  data?: Record<string, unknown>
}): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
    },
  })
}

export async function emailPrefsFor(recipientId: string) {
  return db.notificationPreference.findUnique({
    where: { userId: recipientId },
    select: { offerEmails: true, chatEmails: true, orderEmails: true, reviewEmails: true, marketingEmails: true },
  })
}

export async function recipientEmailInfo(
  recipientId: string,
): Promise<{ displayName: string; email: string | null; hasEmailVerified: boolean } | null> {
  const [prof, usr] = await Promise.all([
    db.profile.findUnique({ where: { id: recipientId }, select: { displayName: true } }),
    db.user.findUnique({ where: { id: recipientId }, select: { email: true, hasEmailVerified: true } }),
  ])
  if (!usr) return null
  return { displayName: prof?.displayName ?? 'there', email: usr.email, hasEmailVerified: usr.hasEmailVerified }
}
