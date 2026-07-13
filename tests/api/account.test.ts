/**
 * /api/v1/me* + favorites + push-tokens + reports — profile management, the
 * store-mandated account deletion (sessions revoked, identity anonymized),
 * and the small per-user registries.
 */
import { ok, summary, exitCode, resetDb, makeUser, accessTokenFor, apiRequest, read } from './_harness'
import { makeListing } from '../authz/_harness'
import { db } from '@/lib/db'
import { GET as me } from '@/app/api/v1/me/route'
import { PATCH as patchProfile } from '@/app/api/v1/me/profile/route'
import { GET as usernameCheck } from '@/app/api/v1/me/username-check/route'
import { POST as deleteMe } from '@/app/api/v1/me/delete/route'
import { GET as favorites } from '@/app/api/v1/favorites/route'
import { POST as toggleFav } from '@/app/api/v1/favorites/[listingId]/toggle/route'
import { POST as registerPush, DELETE as unregisterPush } from '@/app/api/v1/push-tokens/route'
import { POST as report } from '@/app/api/v1/reports/route'

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function main() {
  await resetDb()
  const alice = await makeUser()
  const bob = await makeUser()
  const tAlice = await accessTokenFor(alice.id)
  const tBob = await accessTokenFor(bob.id)

  // --- profile update + username conflict ---
  const p1 = await read(
    await patchProfile(apiRequest('/me/profile', { method: 'PATCH', token: tAlice, body: { displayName: 'Alice A', username: 'alice_a', bio: 'Hi!' } })),
  )
  ok('profile PATCH succeeds', p1.status === 200)
  const p2 = await read(
    await patchProfile(apiRequest('/me/profile', { method: 'PATCH', token: tBob, body: { displayName: 'Bob B', username: 'alice_a' } })),
  )
  ok('taken username → 409', p2.status === 409)
  const uc = await read(await usernameCheck(apiRequest('/me/username-check?username=alice_a')))
  ok('username-check reports taken', uc.body.data?.available === false)
  const uc2 = await read(await usernameCheck(apiRequest('/me/username-check?username=totally_free_name')))
  ok('username-check reports free', uc2.body.data?.available === true)

  // --- favorites ---
  const listingId = await makeListing(bob.id, { status: 'active' })
  const t1 = await read(await toggleFav(apiRequest(`/favorites/${listingId}/toggle`, { method: 'POST', token: tAlice }), params({ listingId })))
  ok('favorite on', t1.body.data?.favorited === true)
  const feed = await read(await favorites(apiRequest('/favorites', { token: tAlice })))
  ok('favorites feed has the listing', ((feed.body.data?.listings ?? []) as unknown[]).length === 1)
  const t2 = await read(await toggleFav(apiRequest(`/favorites/${listingId}/toggle`, { method: 'POST', token: tAlice }), params({ listingId })))
  ok('favorite off', t2.body.data?.favorited === false)

  // --- push tokens ---
  const reg = await read(
    await registerPush(apiRequest('/push-tokens', { token: tAlice, body: { token: 'ExponentPushToken[test-alice-1]', platform: 'ios' } })),
  )
  ok('push token registered', reg.status === 200)
  const moved = await read(
    await registerPush(apiRequest('/push-tokens', { token: tBob, body: { token: 'ExponentPushToken[test-alice-1]', platform: 'ios' } })),
  )
  ok('same device re-registers to another user', moved.status === 200)
  const owner = await db.pushToken.findUnique({ where: { token: 'ExponentPushToken[test-alice-1]' }, select: { userId: true } })
  ok('token moved to the new user', owner?.userId === bob.id)
  const unreg = await read(
    await unregisterPush(apiRequest('/push-tokens', { method: 'DELETE', token: tBob, body: { token: 'ExponentPushToken[test-alice-1]' } })),
  )
  ok('push token unregistered', unreg.status === 200)

  // --- reports ---
  const rSelf = await read(await report(apiRequest('/reports', { token: tAlice, body: { reportedUserId: alice.id, reason: 'scam' } })))
  ok("can't report yourself → 422", rSelf.status === 422)
  const rBadReason = await read(await report(apiRequest('/reports', { token: tAlice, body: { listingId, reason: 'not-a-reason' } })))
  ok('unknown reason → 422', rBadReason.status === 422)
  const r = await read(await report(apiRequest('/reports', { token: tAlice, body: { listingId, reason: 'scam', description: 'Suspicious.' } })))
  ok('report submitted', r.status === 200)

  // --- account deletion (store requirement) ---
  const del = await read(await deleteMe(apiRequest('/me/delete', { method: 'POST', token: tAlice })))
  ok('delete account succeeds', del.status === 200)
  const meAfter = await read(await me(apiRequest('/me', { token: tAlice })))
  ok('token dead immediately after deletion → 401', meAfter.status === 401)
  const userRow = await db.user.findUnique({ where: { id: alice.id }, select: { status: true, email: true } })
  ok('user anonymized (status deleted, email null)', userRow?.status === 'deleted' && userRow.email === null)
  const profileRow = await db.profile.findUnique({ where: { id: alice.id }, select: { displayName: true, username: true } })
  ok('profile anonymized', profileRow?.displayName === 'Deleted user' && profileRow.username === null)
  const liveTokens = await db.refreshToken.count({ where: { userId: alice.id, revokedAt: null } })
  ok('all refresh tokens revoked', liveTokens === 0)

  summary('api-account')
  process.exit(exitCode())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
