/**
 * Authorization tests for the notifications repository (lib/db/notifications).
 * Proves owner scoping: user B cannot read, mark-read, or read the prefs of
 * user A. Notifications are seeded directly (dispatch/insert is a system path).
 */
import { db } from '@/lib/db'
import {
  notificationsFor,
  unreadCountFor,
  markNotificationReadFor,
  markAllReadFor,
  getPreferencesFor,
  upsertPreferencesFor,
} from '@/lib/db/notifications'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function seedNotification(userId: string, title: string): Promise<string> {
  const n = await db.notification.create({ data: { userId, type: 'test', title }, select: { id: true } })
  return n.id
}

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })
  const aliceNote = await seedNotification(alice.id, 'Alice offer')
  await seedNotification(bob.id, 'Bob offer')

  // --- ALLOW / DENY reads ---
  const aliceFeed = await notificationsFor(alice.viewer)
  ok('owner sees only their notification', aliceFeed.length === 1 && aliceFeed[0].title === 'Alice offer')
  ok('unread count is per-owner', (await unreadCountFor(alice.viewer)) === 1 && (await unreadCountFor(bob.viewer)) === 1)
  ok('DENY: Bob cannot see Alice’s notification', (await notificationsFor(bob.viewer)).every((n) => n.title !== 'Alice offer'))

  // --- DENY: Bob marking Alice's notification read affects nothing ---
  await markNotificationReadFor(bob.viewer, aliceNote)
  ok('DENY: Bob cannot mark Alice’s notification read', (await unreadCountFor(alice.viewer)) === 1)

  // --- ALLOW: owner marks read ---
  await markNotificationReadFor(alice.viewer, aliceNote)
  ok('owner mark-read works', (await unreadCountFor(alice.viewer)) === 0)
  await seedNotification(alice.id, 'Another')
  await markAllReadFor(alice.viewer)
  ok('owner mark-all-read works', (await unreadCountFor(alice.viewer)) === 0)
  ok('mark-all did not touch Bob', (await unreadCountFor(bob.viewer)) === 1)

  // --- preferences: per-owner ---
  ok('no prefs row → null', (await getPreferencesFor(alice.viewer)) === null)
  await upsertPreferencesFor(alice.viewer, {
    offer_emails: false,
    chat_emails: true,
    order_emails: true,
    review_emails: true,
    marketing_emails: true,
  })
  const aprefs = await getPreferencesFor(alice.viewer)
  ok('owner prefs persisted', aprefs?.offer_emails === false && aprefs?.marketing_emails === true)
  ok('DENY: Bob prefs unaffected by Alice upsert', (await getPreferencesFor(bob.viewer)) === null)

  summary('notifications')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
