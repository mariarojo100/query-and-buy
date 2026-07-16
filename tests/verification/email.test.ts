/**
 * DB-backed tests for email verification token lifecycle (lib/auth/tokens +
 * lib/db/auth). Requires a local target DB (db/baseline). `npm run test:verification`.
 *
 * Covers: verify happy path, single-use (reuse rejected), expiry, invalidation
 * of prior tokens on resend, and the already_verified outcome.
 */
import { randomUUID, createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { issueToken } from '@/lib/auth/tokens'
import {
  consumeEmailVerifyToken,
  markEmailVerified,
  invalidateVerificationTokens,
  getVerificationState,
} from '@/lib/db/auth'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex')

async function main() {
  await resetDb()

  // --- happy path: issue → verify ok → state flips ---
  const u1 = await makeUser({ email: 'ev1@test.ae' })
  await db.user.update({ where: { id: u1.id }, data: { hasEmailVerified: false } })
  await db.profile.update({ where: { id: u1.id }, data: { emailVerified: false } })
  const t1 = await issueToken(u1.id, 'email_verify')
  const r1 = await consumeEmailVerifyToken(hash(t1))
  ok('valid token consumes ok', r1.status === 'ok' && r1.userId === u1.id)
  if (r1.status === 'ok') await markEmailVerified(r1.userId)
  const s1 = await getVerificationState(u1.id)
  ok('email marked verified', s1?.emailVerified === true)
  ok('emailVerifiedAt stamped', (await db.user.findUniqueOrThrow({ where: { id: u1.id }, select: { emailVerifiedAt: true } })).emailVerifiedAt !== null)

  // --- reuse: a consumed token is rejected the second time ---
  const r1b = await consumeEmailVerifyToken(hash(t1))
  ok('reused token is not ok', r1b.status !== 'ok')
  ok('reused token after verify → already_verified', r1b.status === 'already_verified')

  // --- unknown token → invalid ---
  const rUnknown = await consumeEmailVerifyToken(hash('never-issued'))
  ok('unknown token → invalid', rUnknown.status === 'invalid')

  // --- expiry: a past-dated token → expired, not consumed ---
  const u2 = await makeUser({ email: 'ev2@test.ae' })
  const t2 = await issueToken(u2.id, 'email_verify')
  await db.authVerificationToken.update({
    where: { tokenHash: hash(t2) },
    data: { expiresAt: new Date(Date.now() - 1000) },
  })
  const r2 = await consumeEmailVerifyToken(hash(t2))
  ok('expired token → expired', r2.status === 'expired')

  // --- resend invalidates prior unused tokens ---
  const u3 = await makeUser({ email: 'ev3@test.ae' })
  const old = await issueToken(u3.id, 'email_verify')
  await invalidateVerificationTokens(u3.id, 'email_verify') // as issueAndSend does
  const fresh = await issueToken(u3.id, 'email_verify')
  const rOld = await consumeEmailVerifyToken(hash(old))
  ok('old token invalid after resend', rOld.status !== 'ok')
  const rFresh = await consumeEmailVerifyToken(hash(fresh))
  ok('fresh token consumes ok', rFresh.status === 'ok')

  // --- only hashes are stored (never the raw token) ---
  const rowFor = await db.authVerificationToken.findFirst({ where: { userId: u2.id }, select: { tokenHash: true } })
  ok('stored value is a sha256 hash, not the raw token', !!rowFor && rowFor.tokenHash !== t2 && rowFor.tokenHash.length === 64)

  summary('verification/email')
  await disconnect()
  process.exit(exitCode())
}

main()
