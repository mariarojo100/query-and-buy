/**
 * DB-backed integration tests for state-aware contact-info filtering.
 * Requires a local target DB (db/baseline). `npm run test:authz`.
 *
 * Covers the behaviour the pure unit tests can't: contact details are BLOCKED
 * in a conversation before the order is confirmed, and ALLOWED once both parties
 * confirm (contactRevealed) — via isContactRevealedForConversation, the exact
 * gate app/messages/actions.ts uses.
 */
import { db } from '@/lib/db'
import { isContactRevealedForConversation } from '@/lib/db/orders'
import { detectProhibitedContact } from '@/lib/safety/contact'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, makeConversation, disconnect } from '@/tests/authz/_harness'

const PHONE_MSG = 'call me on 0543998301'

async function main() {
  await resetDb()
  const seller = await makeUser({ email: 'ci-seller@test.ae' })
  const buyer = await makeUser({ email: 'ci-buyer@test.ae' })
  const listingId = await makeListing(seller.id)
  const conversationId = await makeConversation(listingId, buyer.id, seller.id)

  // An order for this conversation, not yet confirmed → contact NOT revealed.
  await db.order.create({
    data: {
      listingId,
      conversationId,
      buyerId: buyer.id,
      sellerId: seller.id,
      status: 'negotiating',
      contactRevealed: false,
    },
  })

  // BEFORE confirmation: gate is closed, and a phone message would be blocked.
  const revealedBefore = await isContactRevealedForConversation(buyer.viewer, conversationId)
  ok('contact NOT revealed before confirmation', revealedBefore === false)
  ok('phone message would be blocked pre-confirmation', detectProhibitedContact(PHONE_MSG) !== null && !revealedBefore)

  // AFTER both confirm: contactRevealed = true → gate opens.
  await db.order.updateMany({
    where: { conversationId },
    data: { buyerConfirmed: true, sellerConfirmed: true, contactRevealed: true, status: 'confirmed' },
  })
  const revealedAfter = await isContactRevealedForConversation(seller.viewer, conversationId)
  ok('contact revealed after both confirm', revealedAfter === true)
  ok('phone message allowed post-confirmation (gate open)', revealedAfter === true)

  // A non-participant never sees the conversation's reveal state.
  const outsider = await makeUser({ email: 'ci-outsider@test.ae' })
  ok('non-participant sees no reveal', (await isContactRevealedForConversation(outsider.viewer, conversationId)) === false)

  summary('contact-info')
  await disconnect()
  process.exit(exitCode())
}

main()
