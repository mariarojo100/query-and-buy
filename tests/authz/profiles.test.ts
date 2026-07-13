/**
 * Authorization tests for profile writes (lib/db/profiles).
 * The critical one: a profile update CANNOT set trust/verified columns, and can
 * only ever affect the viewer's own row. Plus username uniqueness.
 */
import { db } from '@/lib/db'
import { updateProfileFor, updateAvatarFor, usernameAvailable } from '@/lib/db/profiles'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })

  // Alice is a verified, trusted user — set by trusted server flows, NOT the form.
  await db.profile.update({
    where: { id: alice.id },
    data: { phoneVerified: true, emailVerified: true, ratingAvg: '4.5', ratingCount: 10, badgeLevel: 'trusted', reportsCount: 2 },
  })
  await db.user.update({ where: { id: alice.id }, data: { trustScore: 80 } })

  // --- ALLOW: owner updates the allowed columns ---
  const r1 = await updateProfileFor(alice.viewer, { displayName: 'Alice A', username: 'alice_a', bio: 'hi', emirate: 'dubai' })
  ok('owner profile update ok', r1.ok === true)
  const p = await db.profile.findUniqueOrThrow({ where: { id: alice.id } })
  ok('allowed columns written', p.displayName === 'Alice A' && p.username === 'alice_a' && p.bio === 'hi' && p.emirate === 'dubai')

  // --- CRITICAL: trust/verified columns are NOT reachable via a profile update ---
  ok('phone_verified preserved', p.phoneVerified === true)
  ok('email_verified preserved', p.emailVerified === true)
  ok('badge_level preserved', p.badgeLevel === 'trusted')
  ok('rating preserved', Number(p.ratingAvg) === 4.5 && p.ratingCount === 10)
  ok('reports_count preserved', p.reportsCount === 2)
  const u = await db.user.findUniqueOrThrow({ where: { id: alice.id } })
  ok('trust_score preserved', u.trustScore === 80)

  // --- OWNERSHIP: Bob's update touches only Bob ---
  await updateProfileFor(bob.viewer, { displayName: 'Bob B', username: 'bob_b', bio: null, emirate: null })
  const pa = await db.profile.findUniqueOrThrow({ where: { id: alice.id } })
  ok('DENY: Bob update did not alter Alice', pa.displayName === 'Alice A' && pa.username === 'alice_a')

  // --- USERNAME uniqueness ---
  const taken = await updateProfileFor(bob.viewer, { displayName: 'Bob B', username: 'alice_a', bio: null, emirate: null })
  ok('duplicate username rejected', taken.ok === false)
  ok('availability: taken for others', (await usernameAvailable('alice_a', bob.id)) === false)
  ok('availability: own handle available', (await usernameAvailable('alice_a', alice.id)) === true)
  ok('availability: free name', (await usernameAvailable('brand_new_name', bob.id)) === true)

  // --- avatar (owner only) ---
  await updateAvatarFor(alice.viewer, 'https://cdn/x.png')
  ok('avatar set for owner', (await db.profile.findUniqueOrThrow({ where: { id: alice.id } })).avatarUrl === 'https://cdn/x.png')

  summary('profiles')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
