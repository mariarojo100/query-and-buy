/**
 * Authorization test for report insert (lib/db/reports). The reporter is pinned
 * to the viewer, so it can never be forged as another user.
 */
import { db } from '@/lib/db'
import { submitReportFor } from '@/lib/db/reports'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })

  await submitReportFor(alice.viewer, { listingId: null, reportedUserId: bob.id, reason: 'spam', description: 'x' })
  const rows = await db.report.findMany()
  ok('report created', rows.length === 1)
  ok('reporter pinned to viewer (not forgeable)', rows[0].reporterId === alice.id)
  ok('reported user recorded', rows[0].reportedUserId === bob.id)

  summary('reports')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
