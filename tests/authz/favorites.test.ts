/**
 * Authorization tests for the favorites repository (lib/db/favorites).
 * Proves owner scoping: user B can never see or affect user A's favorites.
 */
import { favoritedIdsFor, favoritesFeedFor, toggleFavoriteFor } from '@/lib/db/favorites'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })
  const active = await makeListing(alice.id, { title: 'Alice active car' })
  const draft = await makeListing(alice.id, { status: 'draft', title: 'Alice draft car' })

  // --- ALLOW: owner can favorite and read back ---
  ok('starts with no favorites', (await favoritedIdsFor(alice.viewer, [active])).size === 0)
  const t1 = await toggleFavoriteFor(alice.viewer, active)
  ok('toggle on → favorited', t1.favorited === true)
  ok('favoritedIds now includes it', (await favoritedIdsFor(alice.viewer, [active])).has(active))
  const feed = await favoritesFeedFor(alice.viewer)
  ok('feed returns the active favorite', feed.length === 1 && feed[0].id === active)
  ok('feed maps DTO shape (price_fils number)', typeof feed[0].price_fils === 'number' && feed[0].price_fils === 100000)

  // active-only filter: favoriting a draft listing must not surface it
  await toggleFavoriteFor(alice.viewer, draft)
  const feed2 = await favoritesFeedFor(alice.viewer)
  ok('draft favorite excluded from feed', feed2.every((f) => f.id !== draft))

  const t2 = await toggleFavoriteFor(alice.viewer, active)
  ok('toggle off → unfavorited', t2.favorited === false)
  ok('favoritedIds empty after toggle off', (await favoritedIdsFor(alice.viewer, [active])).size === 0)

  // --- DENY: Bob cannot see Alice's favorites (owner scoping) ---
  await toggleFavoriteFor(alice.viewer, active) // Alice favorites again
  ok('DENY: Bob favoritedIds excludes Alice’s favorite', (await favoritedIdsFor(bob.viewer, [active])).size === 0)
  ok('DENY: Bob feed does not include Alice’s favorite', (await favoritesFeedFor(bob.viewer)).length === 0)

  // Bob toggling creates only Bob's own favorite; Alice's is untouched
  await toggleFavoriteFor(bob.viewer, active)
  ok('Bob’s own favorite is independent', (await favoritedIdsFor(bob.viewer, [active])).has(active))
  ok('Alice’s favorite still present after Bob acts', (await favoritedIdsFor(alice.viewer, [active])).has(active))

  summary('favorites')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
