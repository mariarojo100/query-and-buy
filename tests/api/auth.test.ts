/**
 * /api/v1/auth/* — signup, login, token verification, refresh rotation with
 * reuse detection (the security-critical paths).
 */
import { ok, summary, exitCode, resetDb, apiRequest, read } from './_harness'
import { TokenPairSchema } from '@qb/shared'
import { POST as signup } from '@/app/api/v1/auth/signup/route'
import { POST as login } from '@/app/api/v1/auth/login/route'
import { POST as refresh } from '@/app/api/v1/auth/refresh/route'
import { POST as logout } from '@/app/api/v1/auth/logout/route'
import { GET as me } from '@/app/api/v1/me/route'

async function main() {
  await resetDb()

  // --- signup ---
  const s = await read(
    await signup(apiRequest('/auth/signup', { body: { email: 'api-alice@test.ae', password: 'password123', displayName: 'Alice' } })),
  )
  ok('signup returns 201 + envelope', s.status === 201 && s.body.ok === true)
  ok('signup payload matches TokenPairSchema', TokenPairSchema.safeParse(s.body.data).success)

  const dupe = await read(
    await signup(apiRequest('/auth/signup', { body: { email: 'api-alice@test.ae', password: 'password123', displayName: 'Alice2' } })),
  )
  ok('duplicate signup → 409 conflict', dupe.status === 409 && dupe.body.error?.code === 'conflict')

  // --- login ---
  const good = await read(await login(apiRequest('/auth/login', { body: { email: 'api-alice@test.ae', password: 'password123' } })))
  ok('login with correct password succeeds', good.status === 200 && good.body.ok === true)
  const bad = await read(await login(apiRequest('/auth/login', { body: { email: 'api-alice@test.ae', password: 'wrong-password' } })))
  ok('login with wrong password → 401', bad.status === 401)

  const pair = TokenPairSchema.parse(good.body.data)

  // --- access token works on a protected read ---
  const meRes = await read(await me(apiRequest('/me', { token: pair.accessToken })))
  ok('GET /me with valid token → 200 + own id', meRes.status === 200 && meRes.body.data?.id === pair.user.id)
  const meAnon = await read(await me(apiRequest('/me')))
  ok('GET /me without token → 401', meAnon.status === 401)
  const meBad = await read(await me(apiRequest('/me', { token: 'not-a-real-token' })))
  ok('GET /me with garbage token → 401', meBad.status === 401)

  // --- refresh rotation ---
  const r1 = await read(await refresh(apiRequest('/auth/refresh', { body: { refreshToken: pair.refreshToken } })))
  ok('refresh rotates to a new pair', r1.status === 200 && TokenPairSchema.safeParse(r1.body.data).success)
  const rotated = TokenPairSchema.parse(r1.body.data)
  ok('rotated refresh token differs', rotated.refreshToken !== pair.refreshToken)

  // Reusing the OLD (already-rotated) refresh token = theft signal → the whole
  // chain is revoked, including the fresh token from the rotation.
  const reuse = await read(await refresh(apiRequest('/auth/refresh', { body: { refreshToken: pair.refreshToken } })))
  ok('reused refresh token → 401', reuse.status === 401)
  const afterReuse = await read(await refresh(apiRequest('/auth/refresh', { body: { refreshToken: rotated.refreshToken } })))
  ok('reuse revokes the WHOLE chain (fresh token dead too)', afterReuse.status === 401)

  // --- logout revokes ---
  const l = await read(await login(apiRequest('/auth/login', { body: { email: 'api-alice@test.ae', password: 'password123' } })))
  const pair2 = TokenPairSchema.parse(l.body.data)
  await logout(apiRequest('/auth/logout', { body: { refreshToken: pair2.refreshToken } }))
  const afterLogout = await read(await refresh(apiRequest('/auth/refresh', { body: { refreshToken: pair2.refreshToken } })))
  ok('refresh after logout → 401', afterLogout.status === 401)

  summary('api-auth')
  process.exit(exitCode())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
