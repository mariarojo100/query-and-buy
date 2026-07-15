/**
 * lib/db/auth — auth-table repositories (MIGRATION FOUNDATION, not yet in runtime use)
 * ===========================================================================
 * The database side of the Supabase-Auth replacement. Everything here operates
 * on the target-stack auth tables (db/baseline/0002_auth_tables.sql) plus the
 * users/profiles/user_roles it bootstraps. NOTHING here runs in the live app —
 * Supabase Auth is still the only active auth. Wiring happens at cutover
 * (Phase 4/P9); the orchestration that will call these lives in lib/auth/*.
 *
 * These functions replace three pieces of Supabase-managed behavior:
 *   - handle_new_user()      → createUserAccount() (a real transaction that
 *                              FAILS LOUDLY, unlike the exception-swallowing trigger)
 *   - sync_email_verified()  → markEmailVerified()
 *   - sync_phone_verified()  → markPhoneVerified()  (+ guard_phone_verified is
 *                              unnecessary: only this path writes the flag)
 *
 * Lives under lib/db/** so it may use the raw client; callers use these
 * functions, never `db` directly (see lib/db/README.md).
 */
import { randomUUID, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import type { AppRole } from '@/lib/generated/prisma/enums'

/** `user_<12 hex>` — matches the username pattern handle_new_user/backfill used. */
function generateUsername(): string {
  return `user_${randomBytes(6).toString('hex')}`
}

export interface CreateUserAccountInput {
  email: string
  displayName: string
  /** bcrypt hash for a password signup; omit for an OAuth-only account. */
  passwordHash?: string
  /** for an OAuth signup: links an auth_accounts row in the same transaction. */
  oauth?: { provider: string; providerAccountId: string }
  /** Google/OAuth avatar, if any. */
  avatarUrl?: string | null
  /** OAuth emails arrive pre-verified from the provider. */
  emailVerified?: boolean
  locale?: string
}

/**
 * Transactional signup bundle — the app-level replacement for handle_new_user.
 * Creates users + profiles (+ generated username) + user_roles('user') and,
 * depending on the path, auth_credentials or auth_accounts. All-or-nothing.
 * Returns the new user id.
 */
export async function createUserAccount(input: CreateUserAccountInput): Promise<{ id: string }> {
  const id = randomUUID()
  const emailVerified = input.emailVerified ?? false

  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        email: input.email,
        locale: input.locale ?? 'en',
        hasEmailVerified: emailVerified,
      },
    })
    await tx.profile.create({
      data: {
        id,
        displayName: input.displayName,
        username: generateUsername(),
        avatarUrl: input.avatarUrl ?? null,
        emailVerified,
      },
    })
    await tx.userRole.create({ data: { userId: id, role: 'user' satisfies AppRole } })

    if (input.passwordHash) {
      await tx.authCredential.create({ data: { userId: id, passwordHash: input.passwordHash } })
    }
    if (input.oauth) {
      await tx.authAccount.create({
        data: { userId: id, provider: input.oauth.provider, providerAccountId: input.oauth.providerAccountId },
      })
    }
  })

  return { id }
}

// --- credentials -----------------------------------------------------------

/** Fetch the credential + minimal user identity for a login attempt (by email). */
export async function getCredentialByEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      hasEmailVerified: true,
      authCredential: { select: { passwordHash: true } },
    },
  })
  if (!user?.authCredential) return null
  return {
    userId: user.id,
    email: user.email,
    status: user.status,
    emailVerified: user.hasEmailVerified,
    passwordHash: user.authCredential.passwordHash,
  }
}

/** Set (or replace) a user's password hash — used by reset and by OAuth users adding a password. */
export async function upsertPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await db.authCredential.upsert({
    where: { userId },
    create: { userId, passwordHash },
    update: { passwordHash },
  })
}

/** True-ish identity check by email, independent of whether a credential exists. */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { email }, select: { id: true } })
  return u?.id ?? null
}

// --- oauth accounts --------------------------------------------------------

/** Resolve a user id from a linked OAuth identity, or null. */
export async function findUserIdByOAuth(provider: string, providerAccountId: string): Promise<string | null> {
  const row = await db.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { userId: true },
  })
  return row?.userId ?? null
}

export async function linkOAuthAccount(userId: string, provider: string, providerAccountId: string): Promise<void> {
  await db.authAccount.create({ data: { userId, provider, providerAccountId } })
}

// --- verification-state writers (replace the auth.users sync triggers) ------

/** Replaces sync_email_verified(): mirror confirmed email into users + profiles. */
export async function markEmailVerified(userId: string): Promise<void> {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { hasEmailVerified: true } }),
    db.profile.update({ where: { id: userId }, data: { emailVerified: true } }),
  ])
}

/**
 * Replaces sync_phone_verified() (+ makes guard_phone_verified unnecessary):
 * set the phone number and verified flags across users + profiles atomically.
 */
export async function markPhoneVerified(userId: string, phoneE164: string): Promise<void> {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { phoneE164, hasMobileVerified: true } }),
    db.profile.update({ where: { id: userId }, data: { phoneVerified: true } }),
  ])
}

// --- verification / reset tokens (only the hash is stored) ------------------

export type VerificationTokenType = 'email_verify' | 'password_reset'

export async function createVerificationToken(input: {
  userId: string
  type: VerificationTokenType
  tokenHash: string
  expiresAt: Date
}): Promise<void> {
  await db.authVerificationToken.create({ data: input })
}

/**
 * Atomically consume a token: it must exist, match the type, be unexpired and
 * unused. Marks it used and returns the user id, or null if invalid. The
 * updateMany-with-guard makes redemption single-use even under a race.
 */
export async function consumeVerificationToken(
  tokenHash: string,
  type: VerificationTokenType,
): Promise<{ userId: string } | null> {
  return db.$transaction(async (tx) => {
    const row = await tx.authVerificationToken.findUnique({
      where: { tokenHash },
      select: { userId: true, type: true, expiresAt: true, usedAt: true },
    })
    if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) return null
    const claimed = await tx.authVerificationToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (claimed.count !== 1) return null
    return { userId: row.userId }
  })
}

// --- phone OTP (Twilio-backed flow state) ----------------------------------

export async function upsertPhoneOtp(input: {
  userId: string
  phoneE164: string
  codeHash: string
  expiresAt: Date
}): Promise<void> {
  await db.authPhoneOtp.upsert({
    where: { userId: input.userId },
    create: { ...input, attempts: 0 },
    update: { phoneE164: input.phoneE164, codeHash: input.codeHash, expiresAt: input.expiresAt, attempts: 0 },
  })
}

/** Read the active OTP row for a user (app code compares the hash + attempts). */
export async function getPhoneOtp(userId: string) {
  return db.authPhoneOtp.findUnique({ where: { userId } })
}

export async function incrementPhoneOtpAttempts(userId: string): Promise<void> {
  await db.authPhoneOtp.update({ where: { userId }, data: { attempts: { increment: 1 } } })
}

export async function clearPhoneOtp(userId: string): Promise<void> {
  await db.authPhoneOtp.deleteMany({ where: { userId } })
}
