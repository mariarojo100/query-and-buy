/**
 * /api/v1/conversations* + offers/orders — participant scoping, contact
 * protection, the block feature (App Store UGC), and the negotiation state
 * machine through to contact reveal.
 */
import { ok, summary, exitCode, resetDb, makeUser, accessTokenFor, apiRequest, read } from './_harness'
import { makeListing } from '../authz/_harness'
import { POST as createConv, GET as inbox } from '@/app/api/v1/conversations/route'
import { GET as thread } from '@/app/api/v1/conversations/[id]/route'
import { POST as sendMsg } from '@/app/api/v1/conversations/[id]/messages/route'
import { POST as makeOffer } from '@/app/api/v1/conversations/[id]/offers/route'
import { POST as respondOffer } from '@/app/api/v1/offers/[id]/respond/route'
import { POST as orderAction } from '@/app/api/v1/orders/[id]/[action]/route'
import { GET as contacts } from '@/app/api/v1/orders/[id]/contacts/route'
import { POST as blockUser, DELETE as unblockUser } from '@/app/api/v1/users/[id]/block/route'

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function main() {
  await resetDb()
  const seller = await makeUser()
  const buyer = await makeUser()
  const stranger = await makeUser()
  const tSeller = await accessTokenFor(seller.id)
  const tBuyer = await accessTokenFor(buyer.id)
  const tStranger = await accessTokenFor(stranger.id)

  const listingId = await makeListing(seller.id, { status: 'active', title: 'Deal me' })

  // --- conversation creation + scoping ---
  const c = await read(await createConv(apiRequest('/conversations', { token: tBuyer, body: { listingId } })))
  ok('buyer opens a conversation', c.status === 200 && typeof c.body.data?.conversationId === 'string')
  const convId = c.body.data!.conversationId as string

  const again = await read(await createConv(apiRequest('/conversations', { token: tBuyer, body: { listingId } })))
  ok('createConversation is idempotent', again.body.data?.conversationId === convId)

  const selfMsg = await read(await createConv(apiRequest('/conversations', { token: tSeller, body: { listingId } })))
  ok("seller can't message their own listing", selfMsg.status === 403)

  // --- messages: send + read scoping + contact protection ---
  const m = await read(
    await sendMsg(apiRequest(`/conversations/${convId}/messages`, { token: tBuyer, body: { body: 'Is this available?' } }), params({ id: convId })),
  )
  ok('participant can send a message', m.status === 200)

  const contact = await read(
    await sendMsg(apiRequest(`/conversations/${convId}/messages`, { token: tBuyer, body: { body: 'call me 0501234567' } }), params({ id: convId })),
  )
  ok('contact info in a message is blocked (422)', contact.status === 422 && contact.body.error?.code === 'blocked_content')

  const tView = await read(await thread(apiRequest(`/conversations/${convId}`, { token: tSeller }), params({ id: convId })))
  const msgs = (tView.body.data?.messages ?? []) as unknown[]
  ok('other participant reads the thread (1 message)', tView.status === 200 && msgs.length === 1)

  const tForeign = await read(await thread(apiRequest(`/conversations/${convId}`, { token: tStranger }), params({ id: convId })))
  ok('a stranger cannot read the thread → 404', tForeign.status === 404)

  // --- block feature (App Store UGC requirement) ---
  const b = await read(await blockUser(apiRequest(`/users/${buyer.id}/block`, { method: 'POST', token: tSeller }), params({ id: buyer.id })))
  ok('seller blocks the buyer', b.status === 200)
  const inboxBlocked = await read(await inbox(apiRequest('/conversations', { token: tSeller })))
  ok('blocked thread hidden from inbox', ((inboxBlocked.body.data?.conversations ?? []) as unknown[]).length === 0)
  const msgBlocked = await read(
    await sendMsg(apiRequest(`/conversations/${convId}/messages`, { token: tBuyer, body: { body: 'hello?' } }), params({ id: convId })),
  )
  ok('blocked pair cannot message (422)', msgBlocked.status === 422)
  await unblockUser(apiRequest(`/users/${buyer.id}/block`, { method: 'DELETE', token: tSeller }), params({ id: buyer.id }))
  const msgAfter = await read(
    await sendMsg(apiRequest(`/conversations/${convId}/messages`, { token: tBuyer, body: { body: 'sorry, still keen' } }), params({ id: convId })),
  )
  ok('unblock restores messaging', msgAfter.status === 200)

  // --- negotiation → confirm → contact reveal ---
  const o = await read(await makeOffer(apiRequest(`/conversations/${convId}/offers`, { token: tBuyer, body: { amountAed: 900 } }), params({ id: convId })))
  ok('buyer makes an offer', o.status === 200)

  const tAfterOffer = await read(await thread(apiRequest(`/conversations/${convId}`, { token: tSeller }), params({ id: convId })))
  const order = tAfterOffer.body.data?.order as { order?: { id: string }; offers?: { id: string; status: string }[] } | null
  const pendingOffer = order?.offers?.find((x) => x.status === 'pending')
  ok('thread exposes the pending offer', !!pendingOffer)

  if (pendingOffer && order?.order) {
    const acc = await read(
      await respondOffer(apiRequest(`/offers/${pendingOffer.id}/respond`, { token: tSeller, body: { action: 'accept' } }), params({ id: pendingOffer.id })),
    )
    ok('seller accepts the offer', acc.status === 200)

    const orderId = order.order.id
    const earlyContacts = await read(await contacts(apiRequest(`/orders/${orderId}/contacts`, { token: tBuyer }), params({ id: orderId })))
    ok('contacts locked before both confirm', earlyContacts.status === 403)

    const cb = await read(await orderAction(apiRequest(`/orders/${orderId}/confirm`, { method: 'POST', token: tBuyer }), params({ id: orderId, action: 'confirm' })))
    const cs = await read(await orderAction(apiRequest(`/orders/${orderId}/confirm`, { method: 'POST', token: tSeller }), params({ id: orderId, action: 'confirm' })))
    ok('both parties confirm', cb.status === 200 && cs.status === 200)

    const rc = await read(await contacts(apiRequest(`/orders/${orderId}/contacts`, { token: tBuyer }), params({ id: orderId })))
    ok('contacts revealed after both confirm', rc.status === 200 && !!rc.body.data?.seller)
    const rcStranger = await read(await contacts(apiRequest(`/orders/${orderId}/contacts`, { token: tStranger }), params({ id: orderId })))
    ok('stranger cannot see contacts', rcStranger.status === 403)

    const sold = await read(await orderAction(apiRequest(`/orders/${orderId}/sold`, { method: 'POST', token: tSeller }), params({ id: orderId, action: 'sold' })))
    ok('seller completes the sale', sold.status === 200)
  }

  summary('api-messaging-orders')
  process.exit(exitCode())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
