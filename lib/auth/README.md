# `lib/auth` — auth foundation (non-wired)

> **Status: scaffolding only, not wired into the running app.** Phase 3
> ("Foundation only" scope) of the Supabase→self-managed migration. Supabase
> Auth is still the sole active auth. There is **no** Auth.js config, route
> handler, middleware change, or `app/(auth)/actions.ts` change here — those are
> the runtime wiring, deliberately deferred to cutover (MIGRATION_TASKS.md
> Phase 3 / P9). Everything below compiles and is unit-testable in isolation.

## What this delivers

The database-independent auth *logic* that will drive Auth.js later, plus the
DB writers that replace the three Supabase `auth.users` triggers.

| File | Role | Replaces |
|---|---|---|
| `password.ts` | bcrypt hash/verify (bcryptjs, cost 12) | GoTrue password hashing; verifies migrated Supabase `$2a$` hashes as-is |
| `tokens.ts` | issue/redeem hashed, single-use email-verify & reset tokens | Supabase confirmation/recovery links |
| `signup.ts` | `registerWithPassword`, `beginPasswordReset`, `completePasswordReset` | `auth.signUp`, `resetPasswordForEmail`, `updateUser({password})` |
| `phone.ts` | phone-OTP state machine (`startPhoneVerification`, `verifyPhoneCode`) | Supabase Auth phone-change OTP |
| [`../db/auth.ts`](../db/auth.ts) | auth-table repositories + the transactional signup bundle + verification-state writers | `handle_new_user`, `sync_email_verified`, `sync_phone_verified` triggers |

## Design notes

- **Loud failure.** `createUserAccount` is one transaction that throws on any
  problem — unlike `handle_new_user`, which swallowed exceptions after a past
  OAuth-signup outage. The `guard_phone_verified` trigger becomes unnecessary
  because only `markPhoneVerified` writes the verified flags.
- **Password portability.** bcryptjs verifies Supabase's exported hashes, so the
  data migration does not force a password reset (MIGRATION_BLUEPRINT.md §3.2).
- **External steps are the caller's.** Sending verification/reset emails
  (Resend) and OTP SMS (Twilio) is done by the wiring layer; these functions
  return the raw token/code for that purpose and never send anything themselves.
- **Boundary.** `lib/auth/*` is pure orchestration and calls the `lib/db/auth`
  repository; it never imports the raw Prisma client (enforced by
  `npm run check:boundaries`).

## Still to come (wiring — NOT in this phase)

Auth.js v5 config with Credentials + Google providers and JWT callbacks; the
`app/api/auth/[...nextauth]/route.ts` handler; `getViewer()` over the session;
the `middleware.ts` swap; and the `app/(auth)/actions.ts` / auth-component
rewrites. Design for all of these is in TARGET_ARCHITECTURE.md §3.
