/**
 * DB-backed tests for the phone-verification gate + phone marking.
 * Requires a local target DB (db/baseline). `npm run test:verification`.
 *
 * Covers: the phoneUnverified() gate blocks until the phone is verified (this
 * is what app/sell + app/orders check before publish / confirm-order → which
 * unlocks contact details), and duplicate-phone rejection.
 */
import { db } from '@/lib/db'
import { phoneUnverified } from '@/lib/authz/require-verified'
import { markPhoneVerified, findUserIdByPhone, isPhoneVerified } from '@/lib/db/auth'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()

  const seller = await makeUser({ email: 'pv-seller@test.ae' }) // phone unverified by default

  // --- gate blocks while phone is unverified ---
  ok('isPhoneVerified false before', (await isPhoneVerified(seller.id)) === false)
  const blocked = await phoneUnverified(seller.viewer)
  ok('phone gate blocks when unverified', blocked?.needPhoneVerify === true)

  // --- verify the phone → gate passes ---
  await markPhoneVerified(seller.id, '+971500000001')
  ok('isPhoneVerified true after', (await isPhoneVerified(seller.id)) === true)
  const allowed = await phoneUnverified(seller.viewer)
  ok('phone gate passes after verify', allowed === null)
  ok(
    'both users + profiles flags set',
    (await db.user.findUniqueOrThrow({ where: { id: seller.id }, select: { hasMobileVerified: true } })).hasMobileVerified === true &&
      (await db.profile.findUniqueOrThrow({ where: { id: seller.id }, select: { phoneVerified: true } })).phoneVerified === true,
  )

  // --- duplicate phone: a second account cannot claim the same number ---
  const other = await makeUser({ email: 'pv-other@test.ae' })
  ok('number is owned by the first account', (await findUserIdByPhone('+971500000001')) === seller.id)
  let threw = false
  try {
    await markPhoneVerified(other.id, '+971500000001')
  } catch {
    threw = true
  }
  ok('second account cannot claim the same number (unique)', threw)

  summary('verification/phone-guard')
  await disconnect()
  process.exit(exitCode())
}

main()
