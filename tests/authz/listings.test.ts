/**
 * Authorization tests for the listings repository (lib/db/listings).
 * Covers: public feeds only expose active listings; getListingById visibility
 * (draft/sold visible to owner, hidden from others, visible to an order
 * participant); my-listings + edit loader are owner-scoped.
 */
import { db } from '@/lib/db'
import {
  filteredListings,
  featuredListings,
  myListings,
  listingForEdit,
  listingByIdVisible,
} from '@/lib/db/listings'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })

  const active = await makeListing(alice.id, { title: 'Alice active' })
  const draft = await makeListing(alice.id, { status: 'draft', title: 'Alice draft' })
  const sold = await makeListing(alice.id, { status: 'sold', title: 'Alice sold' })

  // --- public feeds: only active listings, regardless of viewer ---
  const feed = await filteredListings({})
  ok('feed contains active listing', feed.listings.some((l) => l.id === active))
  ok('feed excludes draft', feed.listings.every((l) => l.id !== draft))
  ok('feed excludes sold', feed.listings.every((l) => l.id !== sold))
  ok('feed DTO maps (price_fils number)', typeof feed.listings[0]?.price_fils === 'number')
  ok('featured empty (none featured)', (await featuredListings()).length === 0)

  // --- getListingById visibility ---
  ok('anyone sees an active listing', (await listingByIdVisible(null, active))?.id === active)
  ok('anyone sees active (as Bob too)', (await listingByIdVisible(bob.viewer, active))?.id === active)
  ok('owner sees their draft', (await listingByIdVisible(alice.viewer, draft))?.id === draft)
  ok('DENY: anonymous cannot see a draft', (await listingByIdVisible(null, draft)) === null)
  ok('DENY: Bob cannot see Alice’s draft', (await listingByIdVisible(bob.viewer, draft)) === null)
  ok('DENY: Bob cannot see Alice’s sold listing', (await listingByIdVisible(bob.viewer, sold)) === null)

  // staff can see anything
  const mod = await makeUser({ email: 'mod@test.ae', roles: ['moderator'] })
  ok('staff can see a draft', (await listingByIdVisible(mod.viewer, draft))?.id === draft)

  // order participant can see a reserved/sold listing they're party to
  const reserved = await makeListing(alice.id, { status: 'reserved', title: 'reserved' })
  ok('DENY before order: Bob cannot see reserved', (await listingByIdVisible(bob.viewer, reserved)) === null)
  await db.order.create({
    data: { listingId: reserved, buyerId: bob.id, sellerId: alice.id, status: 'negotiating' },
  })
  ok('order participant (buyer) CAN see the reserved listing', (await listingByIdVisible(bob.viewer, reserved))?.id === reserved)
  const carol = await makeUser({ email: 'carol@test.ae' })
  ok('DENY: unrelated user still cannot see reserved', (await listingByIdVisible(carol.viewer, reserved)) === null)

  // --- my-listings + edit loader: owner-scoped ---
  const aliceMine = await myListings(alice.viewer)
  ok('owner my-listings returns all own (incl. draft/sold)', aliceMine.length === 4)
  ok('DENY: Bob my-listings is empty', (await myListings(bob.viewer)).length === 0)
  ok('owner can load own listing for edit', (await listingForEdit(alice.viewer, draft))?.id === draft)
  ok('DENY: Bob cannot load Alice’s listing for edit', (await listingForEdit(bob.viewer, draft)) === null)

  summary('listings')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
