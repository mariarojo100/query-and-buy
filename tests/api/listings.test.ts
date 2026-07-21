/**
 * /api/v1/listings* — public feed visibility, detail authorization, create
 * (incl. the safety screen), and owner-only lifecycle transitions.
 */
import { ok, summary, exitCode, resetDb, makeUser, accessTokenFor, apiRequest, read } from './_harness'
import { makeListing } from '../authz/_harness'
import { FeedListingSchema } from '@qb/shared'
import { db } from '@/lib/db'
import { GET as feed } from '@/app/api/v1/listings/route'
import { GET as detail } from '@/app/api/v1/listings/[id]/route'
import { POST as create } from '@/app/api/v1/listings/create/route'
import { POST as lifecycle } from '@/app/api/v1/listings/[id]/[action]/route'

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function main() {
  await resetDb()
  const seller = await makeUser({ phoneVerified: true }) // publishing requires a verified phone
  const stranger = await makeUser()
  const sellerToken = await accessTokenFor(seller.id)
  const strangerToken = await accessTokenFor(stranger.id)

  const activeId = await makeListing(seller.id, { status: 'active', title: 'Visible car' })
  const draftId = await makeListing(seller.id, { status: 'draft', title: 'Hidden draft' })

  // --- feed ---
  const f = await read(await feed(apiRequest('/listings?limit=10')))
  const listings = (f.body.data?.listings ?? []) as unknown[]
  ok('feed returns 200', f.status === 200)
  ok('feed contains the active listing only', listings.length === 1)
  ok('feed rows match FeedListingSchema', listings.every((l) => FeedListingSchema.safeParse(l).success))

  // --- detail visibility (the RLS-replacement policy) ---
  const dAnon = await read(await detail(apiRequest(`/listings/${activeId}`), params({ id: activeId })))
  ok('anon sees active listing detail', dAnon.status === 200)
  const draftAnon = await read(await detail(apiRequest(`/listings/${draftId}`), params({ id: draftId })))
  ok('anon gets 404 for a draft', draftAnon.status === 404)
  const draftOwner = await read(
    await detail(apiRequest(`/listings/${draftId}`, { token: sellerToken }), params({ id: draftId })),
  )
  ok('owner sees their own draft', draftOwner.status === 200)
  const draftStranger = await read(
    await detail(apiRequest(`/listings/${draftId}`, { token: strangerToken }), params({ id: draftId })),
  )
  ok('another user gets 404 for the draft', draftStranger.status === 404)

  // --- create ---
  const cat = await db.category.findFirst({ where: { isActive: true }, select: { id: true } })
  const validBody = {
    title: 'iPhone 15 Pro for sale',
    description: 'Great condition, barely used, comes with box.',
    priceAed: 2500,
    category_id: cat!.id,
    condition: 'like_new',
    emirate: 'dubai',
    images: [{ storage_key: `${seller.id}/g/0.jpg`, position: 0 }],
  }
  const cAnon = await read(await create(apiRequest('/listings/create', { body: validBody })))
  ok('create without token → 401', cAnon.status === 401)
  const c = await read(await create(apiRequest('/listings/create', { token: sellerToken, body: validBody })))
  ok('create with valid body → 201 + id', c.status === 201 && typeof c.body.data?.id === 'string')
  const cBad = await read(
    await create(apiRequest('/listings/create', { token: sellerToken, body: { ...validBody, title: 'x' } })),
  )
  ok('create with too-short title → 422', cBad.status === 422)
  const cBlocked = await read(
    await create(
      apiRequest('/listings/create', {
        token: sellerToken,
        body: { ...validBody, title: 'Counterfeit designer bags', description: 'Replica luxury handbags, fake but looks real.' },
      }),
    ),
  )
  ok('prohibited content → blocked_content envelope', cBlocked.status === 422 && cBlocked.body.error?.code === 'blocked_content')

  // --- lifecycle (owner-only) ---
  const pStranger = await read(
    await lifecycle(apiRequest(`/listings/${activeId}/pause`, { method: 'POST', token: strangerToken }), params({ id: activeId, action: 'pause' })),
  )
  ok('non-owner cannot pause → 404', pStranger.status === 404)
  const pOwner = await read(
    await lifecycle(apiRequest(`/listings/${activeId}/pause`, { method: 'POST', token: sellerToken }), params({ id: activeId, action: 'pause' })),
  )
  ok('owner can pause', pOwner.status === 200)
  const afterPause = await read(await detail(apiRequest(`/listings/${activeId}`), params({ id: activeId })))
  ok('paused listing hidden from anon', afterPause.status === 404)
  const resume = await read(
    await lifecycle(apiRequest(`/listings/${activeId}/resume`, { method: 'POST', token: sellerToken }), params({ id: activeId, action: 'resume' })),
  )
  ok('owner can resume', resume.status === 200)
  const sold = await read(
    await lifecycle(apiRequest(`/listings/${activeId}/sold`, { method: 'POST', token: sellerToken }), params({ id: activeId, action: 'sold' })),
  )
  ok('owner can mark sold', sold.status === 200)

  summary('api-listings')
  process.exit(exitCode())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
