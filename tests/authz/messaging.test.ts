/**
 * Authorization tests for the messaging repository (lib/db/messaging).
 * The crown jewels: a non-participant must never read a thread or send into it,
 * and a blocked conversation rejects sends.
 */
import {
  conversationsFor,
  conversationViewFor,
  conversationMessagesFor,
  createConversationFor,
  markConversationReadFor,
  sendMessageFor,
} from '@/lib/db/messaging'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, makeConversation, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const seller = await makeUser({ email: 'seller@test.ae' })
  const buyer = await makeUser({ email: 'buyer@test.ae' })
  const stranger = await makeUser({ email: 'stranger@test.ae' })
  const listing = await makeListing(seller.id, { title: 'Item' })
  const conv = await makeConversation(listing, buyer.id, seller.id)

  // --- send: participants only ---
  const s1 = await sendMessageFor(buyer.viewer, conv, 'hi seller')
  ok('buyer (participant) can send', s1.ok === true)
  ok('recipient is the other participant', s1.ok && s1.recipientId === seller.id)
  const s2 = await sendMessageFor(seller.viewer, conv, 'hi buyer')
  ok('seller (participant) can send', s2.ok === true)
  const s3 = await sendMessageFor(stranger.viewer, conv, 'let me in')
  ok('DENY: stranger cannot send', s3.ok === false && s3.reason === 'not_participant')

  // --- read thread: participants only (the critical leak check) ---
  ok('buyer reads the thread', (await conversationMessagesFor(buyer.viewer, conv)).length === 2)
  ok('seller reads the thread', (await conversationMessagesFor(seller.viewer, conv)).length === 2)
  ok('DENY: stranger reads empty thread (no leak)', (await conversationMessagesFor(stranger.viewer, conv)).length === 0)

  // --- conversation view + inbox scoping ---
  ok('participant gets the conversation view', (await conversationViewFor(buyer.viewer, conv))?.id === conv)
  ok('DENY: stranger gets null view', (await conversationViewFor(stranger.viewer, conv)) === null)
  ok('buyer inbox has the conversation', (await conversationsFor(buyer.viewer)).some((i) => i.id === conv))
  ok('DENY: stranger inbox is empty', (await conversationsFor(stranger.viewer)).length === 0)

  // --- mark read: participants only ---
  ok('participant can mark read', (await markConversationReadFor(seller.viewer, conv)) === true)
  ok('DENY: stranger mark-read is a no-op', (await markConversationReadFor(stranger.viewer, conv)) === false)

  // --- blocked conversation rejects sends ---
  const blocked = await makeConversation(listing, stranger.id, seller.id, { status: 'blocked' })
  const s4 = await sendMessageFor(stranger.viewer, blocked, 'hello')
  ok('DENY: cannot send to a blocked conversation', s4.ok === false && s4.reason === 'blocked')

  // --- createConversation: buyer pinned, no self-message, idempotent ---
  const c1 = await createConversationFor(stranger.viewer, listing)
  ok('new conversation created for buyer', typeof c1.conversationId === 'string')
  const c2 = await createConversationFor(stranger.viewer, listing)
  ok('createConversation is idempotent', c2.conversationId === c1.conversationId)
  const self = await createConversationFor(seller.viewer, listing)
  ok('DENY: seller cannot message themselves', self.error !== undefined && self.conversationId === undefined)

  summary('messaging')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
