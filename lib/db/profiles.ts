/**
 * lib/db/profiles — Viewer-scoped profile writes (Phase 4).
 * ===========================================================================
 * Replaces profiles_owner_write RLS + the guard_phone_verified trigger with an
 * explicit COLUMN ALLOWLIST: these functions can only ever write display_name,
 * username, bio, emirate, avatar_url. There is no code path here to set
 * verified flags, rating, trust_score, badge_level, reports_count, etc. — those
 * are written only by trusted server flows (auth verification, counters). A
 * user updating their profile therefore cannot escalate their own trust.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'
import type { Emirate } from '@/lib/generated/prisma/enums'

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'
}

export type UpdateProfileResult = { ok: true } | { ok: false; error: 'username_taken' }

export async function updateProfileFor(
  viewer: Viewer,
  input: { displayName: string; username: string; bio: string | null; emirate: string | null },
): Promise<UpdateProfileResult> {
  try {
    await db.profile.update({
      where: { id: viewer.id },
      data: {
        displayName: input.displayName,
        username: input.username,
        bio: input.bio,
        emirate: (input.emirate ?? null) as Emirate | null,
      },
    })
    return { ok: true }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: 'username_taken' }
    throw e
  }
}

export async function updateAvatarFor(viewer: Viewer, avatarUrl: string): Promise<void> {
  await db.profile.update({ where: { id: viewer.id }, data: { avatarUrl } })
}

/** Free if nobody holds `username`, or the current viewer already holds it. */
export async function usernameAvailable(username: string, viewerId: string | null): Promise<boolean> {
  const existing = await db.profile.findUnique({ where: { username }, select: { id: true } })
  if (!existing) return true
  return viewerId != null && existing.id === viewerId
}

// --- public profile reads (Phase 4) -----------------------------------------

export type ProfileRecord = {
  id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  emirate: string | null
  badge_level: string
  rating_avg: number
  rating_count: number
  listings_count: number
  member_since: string
  email_verified: boolean
  phone_verified: boolean
  reports_count: number
}

const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  emirate: true,
  badgeLevel: true,
  ratingAvg: true,
  ratingCount: true,
  listingsCount: true,
  memberSince: true,
  emailVerified: true,
  phoneVerified: true,
  reportsCount: true,
} as const

type ProfileRow = {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string | null
  bio: string | null
  emirate: string | null
  badgeLevel: string
  ratingAvg: unknown
  ratingCount: number
  listingsCount: number
  memberSince: Date
  emailVerified: boolean
  phoneVerified: boolean
  reportsCount: number
}

function mapProfile(p: ProfileRow): ProfileRecord {
  return {
    id: p.id,
    username: p.username,
    display_name: p.displayName,
    avatar_url: p.avatarUrl,
    bio: p.bio,
    emirate: p.emirate,
    badge_level: p.badgeLevel,
    rating_avg: Number(p.ratingAvg),
    rating_count: p.ratingCount,
    listings_count: p.listingsCount,
    member_since: p.memberSince.toISOString(),
    email_verified: p.emailVerified,
    phone_verified: p.phoneVerified,
    reports_count: p.reportsCount,
  }
}

/** Public profile by id (world-readable card). */
export async function profileById(id: string): Promise<ProfileRecord | null> {
  const p = await db.profile.findUnique({ where: { id }, select: profileSelect })
  return p ? mapProfile(p) : null
}

/** Public profile by username. */
export async function profileByUsername(username: string): Promise<ProfileRecord | null> {
  const p = await db.profile.findUnique({ where: { username }, select: profileSelect })
  return p ? mapProfile(p) : null
}

/** Minimal header data for the navbar avatar. */
export async function profileHeader(id: string): Promise<{ display_name: string | null; avatar_url: string | null } | null> {
  const p = await db.profile.findUnique({ where: { id }, select: { displayName: true, avatarUrl: true } })
  return p ? { display_name: p.displayName, avatar_url: p.avatarUrl } : null
}

/** How many distinct buyers have completed ≥2 purchases from this seller. */
export async function repeatBuyersFor(sellerId: string): Promise<number> {
  const rows = await db.order.groupBy({
    by: ['buyerId'],
    where: { sellerId, status: 'completed' },
    _count: { _all: true },
  })
  return rows.filter((r) => r._count._all >= 2).length
}

/** The account's current phone number (users.phone_e164) — for the settings display. */
export async function accountPhoneE164(id: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { id }, select: { phoneE164: true } })
  return u?.phoneE164 ?? null
}

/**
 * Delete the viewer's own account (App Store / Play Store requirement).
 * Soft-delete + anonymize in one transaction: the users row keeps its id (so
 * conversations/orders/reviews of OTHER users stay intact) but all personal
 * data is removed and every session ends. Irreversible from the app's side.
 */
export async function deleteAccountFor(viewer: Viewer): Promise<void> {
  const now = new Date()
  await db.$transaction([
    // Kill all sessions + devices first.
    db.refreshToken.updateMany({ where: { userId: viewer.id, revokedAt: null }, data: { revokedAt: now } }),
    db.pushToken.deleteMany({ where: { userId: viewer.id } }),
    // Remove credentials + linked providers (prevents any re-login as this row).
    db.authCredential.deleteMany({ where: { userId: viewer.id } }),
    db.authAccount.deleteMany({ where: { userId: viewer.id } }),
    db.authVerificationToken.deleteMany({ where: { userId: viewer.id } }),
    // Anonymize identity.
    db.user.update({
      where: { id: viewer.id },
      data: {
        status: 'deleted',
        deletedAt: now,
        email: null,
        phoneE164: null,
        hasEmailVerified: false,
        hasMobileVerified: false,
      },
    }),
    db.profile.update({
      where: { id: viewer.id },
      data: {
        displayName: 'Deleted user',
        username: null,
        avatarUrl: null,
        bio: null,
        emailVerified: false,
      },
    }),
    // Take their inventory off the marketplace.
    db.listing.updateMany({
      where: { sellerId: viewer.id, status: { in: ['active', 'draft', 'reserved'] } },
      data: { status: 'deleted', deletedAt: now },
    }),
  ])
}
