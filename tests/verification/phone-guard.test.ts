/**
 * DB-backed tests for the phone-verification gate + phone marking.
 * Requires a local target DB (db/baseline). `npm run test:verification`.
 *
 * Covers: publish blocked until phone verified; confirm-order blocked until
 * verified (gate runs before any order lookup); duplicate-phone rejection;
 * phoneVerifiedAt stamped.
 */
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { createListingAs } from '@/lib/listings/write'
import { confirmOrderAs } from '@/lib/orders/service'
import { markPhoneVerified, findUserIdByPhone, isPhoneVerified } from '@/lib/db/auth'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

const img = (key: string, position: number) => ({ storage_key: key, position })

function listingInput(categoryId: string) {
  return {
    title: 'A perfectly good bicycle',
    description: 'Lightly used, well maintained, ready to ride today.',
    priceAed: 500,
    category_id: categoryId,
    condition: 'used',
    emirate: 'dubai',
    area: 'JBR',
    isNegotiable: true,
    images: [img('seller/g/0.jpg', 0)],
  }
}

async function main() {
  await resetDb()
  const cat = await db.category.findUniqueOrThrow({ where: { slug: 'cars' }, select: { id: true } })

  const seller = await makeUser({ email: 'pv-seller@test.ae' }) // phone unverified by default

  // --- publish is blocked without a verified phone ---
  const blocked = await createListingAs(seller.viewer, listingInput(cat.id))
  ok('publish blocked when phone unverified', blocked.needsPhoneVerification === true && !blocked.id)

  // --- confirm-order is blocked before any order lookup ---
  const orderBlocked = await confirmOrderAs(seller.viewer, randomUUID())
  ok('confirm-order blocked when phone unverified', orderBlocked.needsPhoneVerification === true)

  // --- verify the phone, then publish succeeds ---
  ok('isPhoneVerified false before', (await isPhoneVerified(seller.id)) === false)
  await markPhoneVerified(seller.id, '+971500000001')
  ok('isPhoneVerified true after', (await isPhoneVerified(seller.id)) === true)
  ok(
    'phoneVerifiedAt stamped',
    (await db.user.findUniqueOrThrow({ where: { id: seller.id }, select: { phoneVerifiedAt: true } })).phoneVerifiedAt !== null,
  )
  const published = await createListingAs(seller.viewer, listingInput(cat.id))
  ok('publish succeeds after phone verified', typeof published.id === 'string' && !published.needsPhoneVerification)

  // --- confirm-order now passes the gate (fails later for a bogus order id) ---
  const orderAfter = await confirmOrderAs(seller.viewer, randomUUID())
  ok('confirm-order passes gate after verify (no needsPhoneVerification)', !orderAfter.needsPhoneVerification)

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
