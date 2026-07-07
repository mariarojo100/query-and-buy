/**
 * Authorization + state-machine tests for the orders negotiation engine
 * (lib/db/orders) — the most security-critical module.
 * Walks the full lifecycle and asserts every deny boundary, especially the
 * contact-reveal gate and the cross-entity listing transitions.
 */
import { db } from '@/lib/db'
import * as o from '@/lib/db/orders'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, makeConversation, disconnect } from '@/tests/authz/_harness'

async function listingStatus(id: string): Promise<string> {
  return (await db.listing.findUniqueOrThrow({ where: { id }, select: { status: true } })).status
}
async function pendingOfferId(orderId: string): Promise<string> {
  const off = await db.offer.findFirstOrThrow({ where: { orderId, status: 'pending' }, select: { id: true } })
  return off.id
}

async function main() {
  await resetDb()
  const seller = await makeUser({ email: 'seller@test.ae' })
  const buyer = await makeUser({ email: 'buyer@test.ae' })
  const stranger = await makeUser({ email: 'stranger@test.ae' })

  // ============ Scenario A: full happy-path lifecycle + deny checks ============
  const listing = await makeListing(seller.id, { title: 'Camera' })
  const conv = await makeConversation(listing, buyer.id, seller.id)

  // seller can't open the negotiation
  const preSeller = await o.makeOfferFor(seller.viewer, conv, 500000)
  ok('DENY: seller cannot open the order first', preSeller.ok === false)

  // buyer opens with an offer
  const off1 = await o.makeOfferFor(buyer.viewer, conv, 500000)
  ok('buyer makes first offer', off1.ok === true)
  const co = await o.conversationOrderFor(buyer.viewer, conv)
  ok('order exists, one pending offer', co.order?.status === 'offer_sent' && co.offers.length === 1)
  const orderId = co.order!.id

  ok('DENY: stranger cannot make an offer', (await o.makeOfferFor(stranger.viewer, conv, 400000)).ok === false)
  ok('DENY: stranger cannot read the order', (await o.conversationOrderFor(stranger.viewer, conv)).order === null)

  // respond to offer
  const offerId = await pendingOfferId(orderId)
  ok('DENY: sender cannot accept own offer', (await o.respondToOfferFor(buyer.viewer, offerId, 'accept')).ok === false)
  ok('DENY: stranger cannot respond', (await o.respondToOfferFor(stranger.viewer, offerId, 'accept')).ok === false)
  const acc = await o.respondToOfferFor(seller.viewer, offerId, 'accept')
  ok('seller accepts the offer', acc.ok === true)
  const afterAccept = await o.conversationOrderFor(seller.viewer, conv)
  ok('order accepted at the offered price', afterAccept.order?.status === 'offer_accepted' && afterAccept.order?.accepted_price_fils === 500000)

  // contacts hidden before both confirm
  ok('DENY: contacts hidden before both confirm', (await o.revealedContactsFor(buyer.viewer, orderId)).error !== undefined)

  // confirmations
  ok('DENY: stranger cannot confirm', (await o.confirmOrderFor(stranger.viewer, orderId)).ok === false)
  const c1 = await o.confirmOrderFor(buyer.viewer, orderId)
  ok('buyer confirms (not both yet)', c1.ok === true && c1.both === false)
  ok('listing still active after one confirm', (await listingStatus(listing)) === 'active')
  const c2 = await o.confirmOrderFor(seller.viewer, orderId)
  ok('seller confirms → both', c2.ok === true && c2.both === true)
  ok('listing → reserved on both-confirm', (await listingStatus(listing)) === 'reserved')

  // contacts revealed now
  const contacts = await o.revealedContactsFor(buyer.viewer, orderId)
  ok('contacts revealed after both confirm', contacts.buyer?.email === 'buyer@test.ae' && contacts.seller?.email === 'seller@test.ae')
  ok('DENY: stranger cannot read revealed contacts', (await o.revealedContactsFor(stranger.viewer, orderId)).error !== undefined)

  // mark sold — seller only
  ok('DENY: buyer cannot mark sold', (await o.markOrderSoldFor(buyer.viewer, orderId)).ok === false)
  const sold = await o.markOrderSoldFor(seller.viewer, orderId)
  ok('seller marks sold', sold.ok === true)
  ok('listing → sold', (await listingStatus(listing)) === 'sold')
  ok('order → completed', (await o.conversationOrderFor(seller.viewer, conv)).order?.status === 'completed')

  // ============ Scenario B: cancel frees a reserved listing ============
  const listingB = await makeListing(seller.id, { title: 'Bike' })
  const convB = await makeConversation(listingB, buyer.id, seller.id)
  await o.makeOfferFor(buyer.viewer, convB, 300000)
  const obId = (await o.conversationOrderFor(buyer.viewer, convB)).order!.id
  await o.respondToOfferFor(seller.viewer, await pendingOfferId(obId), 'accept')
  await o.confirmOrderFor(buyer.viewer, obId)
  await o.confirmOrderFor(seller.viewer, obId)
  ok('B: listing reserved', (await listingStatus(listingB)) === 'reserved')
  const cancel = await o.cancelOrderFor(buyer.viewer, obId)
  ok('B: either party can cancel', cancel.ok === true)
  ok('B: reserved listing freed → active', (await listingStatus(listingB)) === 'active')

  // ============ Scenario C: a new offer supersedes the pending one ============
  const listingC = await makeListing(seller.id, { title: 'Desk' })
  const convC = await makeConversation(listingC, buyer.id, seller.id)
  await o.makeOfferFor(buyer.viewer, convC, 500000)
  await o.makeOfferFor(buyer.viewer, convC, 400000)
  const ocId = (await o.conversationOrderFor(buyer.viewer, convC)).order!.id
  const superseded = await db.offer.count({ where: { orderId: ocId, status: 'superseded' } })
  const pending = await db.offer.count({ where: { orderId: ocId, status: 'pending' } })
  ok('C: previous offer superseded, one pending remains', superseded === 1 && pending === 1)

  summary('orders')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
