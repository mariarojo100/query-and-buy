/**
 * tests/authz/_harness — shared seed + assertion helpers for the Phase-4
 * "test-as-I-go" authorization suite.
 * ===========================================================================
 * Runs against a REAL local Postgres built from db/baseline (see the dev DB in
 * the migration notes). Each test resets the user-owned tables, seeds a known
 * multi-user fixture, and asserts BOTH that the owner can see their data AND
 * that another user cannot — the allow/deny pairs that catch the CRITICAL
 * RLS→app-authz regressions. Run via `npm run test:authz` with DATABASE_URL set
 * to the local target DB.
 *
 * tests/ is outside the check-db-boundaries scan, so importing the raw client
 * here is intentional and allowed.
 */
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { deriveViewer, type Viewer } from '@/lib/authz/viewer'
import type { ListingStatus } from '@/lib/generated/prisma/enums'

let failures = 0
let passes = 0

export function ok(name: string, cond: boolean): void {
  if (cond) {
    passes++
    console.log('PASS ' + name)
  } else {
    failures++
    console.log('FAIL ' + name)
  }
}

export function summary(label: string): void {
  console.log(`RESULT[${label}]: ${passes} pass / ${failures} fail`)
}

export function exitCode(): number {
  return failures > 0 ? 1 : 0
}

/** Wipe all user-owned data (keeps seeded categories + marketplace_settings). */
export async function resetDb(): Promise<void> {
  await db.$executeRawUnsafe('TRUNCATE public.users CASCADE')
}

/** Create a real user (+ profile + role) and return its id and a Viewer. */
export async function makeUser(
  opts: { email?: string; roles?: Parameters<typeof deriveViewer>[0]['roles'] } = {},
): Promise<{ id: string; viewer: Viewer }> {
  const id = randomUUID()
  const email = opts.email ?? `${id.slice(0, 8)}@test.ae`
  await db.user.create({ data: { id, email, hasEmailVerified: true } })
  await db.profile.create({ data: { id, displayName: email.split('@')[0], username: `u_${id.slice(0, 12).replace(/-/g, '')}` } })
  await db.userRole.create({ data: { userId: id, role: 'user' } })
  const roles = opts.roles ?? ['user']
  return { id, viewer: deriveViewer({ id, email, roles }) }
}

let categoryId: string | null = null
async function carsCategory(): Promise<string> {
  if (categoryId) return categoryId
  const c = await db.category.findUniqueOrThrow({ where: { slug: 'cars' }, select: { id: true } })
  categoryId = c.id
  return c.id
}

/** Create a listing owned by `sellerId`. Defaults to an active, published listing. */
export async function makeListing(
  sellerId: string,
  opts: { status?: ListingStatus; title?: string } = {},
): Promise<string> {
  const status = opts.status ?? 'active'
  const l = await db.listing.create({
    data: {
      sellerId,
      categoryId: await carsCategory(),
      titleEn: opts.title ?? 'Test listing',
      description: 'A test listing',
      priceFils: 100000n,
      status,
      publishedAt: status === 'active' ? new Date() : null,
    },
    select: { id: true },
  })
  return l.id
}

export async function disconnect(): Promise<void> {
  await db.$disconnect()
}
