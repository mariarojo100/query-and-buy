/**
 * Functional smoke for the system repositories (lib/db/system/*). These are
 * privileged, non-Viewer-scoped writes/reads — no authz boundary, but they
 * touch tables (notifications, ai_moderation_log, search_log, email_failures)
 * so a quick round-trip guards against schema/mapping errors.
 */
import { db } from '@/lib/db'
import { insertNotification, recipientEmailInfo } from '@/lib/db/system/notifications'
import { insertModerationLog } from '@/lib/db/system/moderation'
import { insertSearchLog, recentSearchQueries } from '@/lib/db/system/search'
import { recordEmailFailure } from '@/lib/db/system/email'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const u = await makeUser({ email: 'sys@test.ae' })
  const listing = await makeListing(u.id, { title: 'L' })

  await insertNotification({ userId: u.id, type: 'test', title: 'Hi', body: 'b', data: { x: 1 } })
  ok('notification inserted', (await db.notification.count({ where: { userId: u.id } })) === 1)

  const info = await recipientEmailInfo(u.id)
  ok('recipient email info', info?.email === 'sys@test.ae')

  await insertModerationLog({ listingId: listing, source: 'listing', decision: 'allowed', confidence: 0.9, reason: null })
  ok('moderation log inserted', (await db.aiModerationLog.count()) === 1)

  await insertSearchLog('camera', u.id)
  await insertSearchLog('camera', null)
  await insertSearchLog('bike', u.id)
  const recent = await recentSearchQueries(7, 100)
  ok('search log rows readable', recent.length === 3)

  await recordEmailFailure({ toEmail: 'x@test.ae', template: 'k', error: 'boom', payload: { a: 1 } })
  await recordEmailFailure({ toEmail: null, template: null, error: 'boom2', payload: null })
  ok('email failures recorded (incl. null payload)', (await db.emailFailure.count()) === 2)

  summary('system')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
