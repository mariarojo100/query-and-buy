/**
 * lib/db/notifications — Viewer-scoped notifications repository (Phase 4).
 * Replaces notifications_owner_read/update + notif_prefs_owner_* RLS with
 * explicit userId=viewer.id scoping. (Notification *inserts* are a system
 * concern — lib/notifications/dispatch.ts → lib/db/system — not here.)
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'
import type { NotificationPrefs } from '@/lib/notifications/preferences'

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export async function notificationsFor(viewer: Viewer, limit = 20): Promise<AppNotification[]> {
  const rows = await db.notification.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  })
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    link: r.link,
    read_at: r.readAt ? r.readAt.toISOString() : null,
    created_at: r.createdAt.toISOString(),
  }))
}

export async function unreadCountFor(viewer: Viewer): Promise<number> {
  return db.notification.count({ where: { userId: viewer.id, readAt: null } })
}

export async function markNotificationReadFor(viewer: Viewer, id: string): Promise<void> {
  await db.notification.updateMany({
    where: { id, userId: viewer.id, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function markAllReadFor(viewer: Viewer): Promise<void> {
  await db.notification.updateMany({
    where: { userId: viewer.id, readAt: null },
    data: { readAt: new Date() },
  })
}

/** Returns the viewer's prefs, or null when no row exists (caller applies defaults). */
export async function getPreferencesFor(viewer: Viewer): Promise<NotificationPrefs | null> {
  const r = await db.notificationPreference.findUnique({
    where: { userId: viewer.id },
    select: { offerEmails: true, chatEmails: true, orderEmails: true, reviewEmails: true, marketingEmails: true },
  })
  if (!r) return null
  return {
    offer_emails: r.offerEmails,
    chat_emails: r.chatEmails,
    order_emails: r.orderEmails,
    review_emails: r.reviewEmails,
    marketing_emails: r.marketingEmails,
  }
}

export async function upsertPreferencesFor(viewer: Viewer, prefs: NotificationPrefs): Promise<void> {
  const data = {
    offerEmails: prefs.offer_emails,
    chatEmails: prefs.chat_emails,
    orderEmails: prefs.order_emails,
    reviewEmails: prefs.review_emails,
    marketingEmails: prefs.marketing_emails,
  }
  await db.notificationPreference.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, ...data },
    update: data,
  })
}
