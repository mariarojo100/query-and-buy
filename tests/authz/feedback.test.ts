/**
 * Authorization test for feedback insert (lib/db/feedback). Anonymous is allowed
 * (userId null); a signed-in row is attributed to the acting user only.
 */
import { db } from '@/lib/db'
import { submitFeedbackRow } from '@/lib/db/feedback'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })

  await submitFeedbackRow(null, { kind: 'bug', message: 'anon msg', path: null, userAgent: null })
  await submitFeedbackRow(alice.id, { kind: 'feature', message: 'signed msg', path: '/x', userAgent: 'UA' })
  const rows = await db.feedback.findMany()
  ok('anonymous feedback allowed (userId null)', rows.some((r) => r.message === 'anon msg' && r.userId === null))
  ok('signed-in feedback attributed to the user', rows.some((r) => r.message === 'signed msg' && r.userId === alice.id))

  summary('feedback')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
