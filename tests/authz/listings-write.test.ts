/**
 * Authorization tests for listing writes (lib/db/listings write functions) +
 * the activity feed visibility. Owner-only mutations; a non-owner affects zero
 * rows. Activity shows drafts only to the owner and private sales only to a
 * participant.
 */
import { db } from '@/lib/db'
import {
  createListingFor,
  updateListingFor,
  markListingSoldFor,
  softDeleteListingFor,
  setListingPausedFor,
  bumpViewCount,
  recordListingView,
} from '@/lib/db/listings'
import { activityDataFor } from '@/lib/db/activity'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

const img = (key: string, position: number) => ({ storage_key: key, position })

async function main() {
  await resetDb()
  const seller = await makeUser({ email: 'seller@test.ae' })
  const other = await makeUser({ email: 'other@test.ae' })
  const cat = await db.category.findUniqueOrThrow({ where: { slug: 'cars' }, select: { id: true } })

  // --- create ---
  const created = await createListingFor(seller.viewer, {
    title: 'My car',
    description: 'A fine used car',
    priceFils: 500000,
    categoryId: cat.id,
    condition: 'used',
    emirate: 'dubai',
    area: null,
    isNegotiable: true,
    images: [img('seller/g/0.jpg', 0), img('seller/g/1.jpg', 1)],
  })
  ok('owner creates a listing', typeof created.id === 'string')
  const id = created.id!
  ok('images created with the listing', (await db.listingImage.count({ where: { listingId: id } })) === 2)

  // --- update: owner replaces images, gets removed keys ---
  const upd = await updateListingFor(seller.viewer, {
    id,
    title: 'My car (updated)',
    description: 'A fine used car, now cheaper',
    priceFils: 450000,
    categoryId: cat.id,
    condition: 'used',
    emirate: 'dubai',
    area: 'JBR',
    isNegotiable: false,
    images: [img('seller/g/0.jpg', 0), img('seller/g/2.jpg', 1)], // dropped 1.jpg, added 2.jpg
  })
  ok('owner updates the listing', 'ok' in upd && upd.ok === true)
  ok('update reports the removed image key', 'ok' in upd && upd.removedKeys.length === 1 && upd.removedKeys[0] === 'seller/g/1.jpg')
  ok('update applied (title + negotiable)', (await db.listing.findUniqueOrThrow({ where: { id }, select: { titleEn: true, isNegotiable: true } })).titleEn === 'My car (updated)')

  // --- DENY: non-owner cannot update / mutate ---
  const foreign = await updateListingFor(other.viewer, {
    id, title: 'hacked', description: 'hacked description here', priceFils: 1, categoryId: cat.id,
    condition: 'used', emirate: 'dubai', area: null, isNegotiable: true, images: [img('x/y.jpg', 0)],
  })
  ok('DENY: non-owner update → not found', 'error' in foreign)
  ok('DENY: non-owner cannot mark sold', (await markListingSoldFor(other.viewer, id)) === false)
  ok('DENY: non-owner cannot soft-delete', (await softDeleteListingFor(other.viewer, id)) === false)
  ok('DENY: non-owner cannot pause', (await setListingPausedFor(other.viewer, id, true)) === false)
  ok('listing untouched by foreign attempts', (await db.listing.findUniqueOrThrow({ where: { id }, select: { titleEn: true, status: true } })).titleEn === 'My car (updated)')

  // --- owner status transitions ---
  ok('owner pauses (active → draft)', (await setListingPausedFor(seller.viewer, id, true)) === true)
  ok('paused listing is draft', (await db.listing.findUniqueOrThrow({ where: { id }, select: { status: true } })).status === 'draft')
  ok('owner resumes (draft → active)', (await setListingPausedFor(seller.viewer, id, false)) === true)
  ok('owner marks sold', (await markListingSoldFor(seller.viewer, id)) === true)

  // --- view counter + recently-viewed ---
  await bumpViewCount(id)
  await bumpViewCount(id)
  ok('bumpViewCount increments', (await db.listing.findUniqueOrThrow({ where: { id }, select: { viewCount: true } })).viewCount === 2)
  await recordListingView(other.viewer, id)
  await recordListingView(other.viewer, id) // idempotent upsert
  ok('recordListingView upserts one row per user', (await db.listingView.count({ where: { userId: other.id, listingId: id } })) === 1)

  // --- activity feed visibility ---
  const draftId = await makeListing(seller.id, { status: 'draft', title: 'Draft item' })
  const ownerFeed = await activityDataFor(seller.viewer, seller.id)
  ok('owner activity includes their draft', ownerFeed.listings.some((l) => l.id === draftId))
  const visitorFeed = await activityDataFor(other.viewer, seller.id)
  ok('DENY: visitor activity excludes the draft', visitorFeed.listings.every((l) => l.id !== draftId))
  ok('anonymous activity has no private sales', (await activityDataFor(null, seller.id)).sales.length === 0)

  summary('listings-write')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
