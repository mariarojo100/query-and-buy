# Email & Phone Verification

Two **independent** verification systems for Query & Buy:

- **Email verification** — confirm ownership of an email via a hashed, single-use, 24h link.
- **Phone verification** — confirm ownership of a number via a **Twilio Verify** OTP.

Email-verified and phone-verified are separate states. One says nothing about the other, and neither is a "Verified Seller" badge — that concept is deliberately not used.

---

## Architecture

```
Email                                        Phone
─────                                        ─────
signup / resend                              enter phone (+ country)
   │ issueToken(email_verify)                   │ normalizeE164
   │ (store SHA-256 hash only, 24h TTL)         │ startVerification  ──► Twilio Verify (owns the OTP)
   ▼                                            ▼
Resend email  ─► inbox ─► /verify-email?token= user enters code
   │ verifyEmail(token)                          │ checkVerification ──► Twilio Verify
   │  consume (single-use) + markEmailVerified   │  status === 'approved'
   ▼                                            ▼
hasEmailVerified = true, emailVerifiedAt set   markPhoneVerified → hasMobileVerified = true, phoneVerifiedAt set
```

- **Auth.js (v5, JWT sessions)** is untouched. The JWT carries only the user id; verification state is read from the DB per request (`getViewer`, `getVerificationState`). We do **not** put verification flags in the token, so existing sessions keep working unchanged.
- The verified **state** is the existing booleans `users.has_email_verified` / `users.has_mobile_verified` (mirrored on `profiles`), which the trust/authz system already reads. This change adds only nullable **audit timestamps** (`email_verified_at`, `phone_verified_at`).
- Phone OTP uses **Twilio Verify** — Twilio generates, sends, stores, and checks the code. **We never generate or store an OTP.**

### Key files

| Area | File |
|------|------|
| Email orchestration | `lib/auth/email-verify.ts` |
| Token issue/redeem (hash-only) | `lib/auth/tokens.ts` |
| Email templates (Resend) | `lib/email/auth-emails.ts`, `lib/email/send.ts` |
| Verify route (redeem + render states) | `app/verify-email/page.tsx` |
| Legacy redirect | `app/auth/confirm/route.ts` → `/verify-email` |
| Email actions (resend / change email) | `app/(auth)/verify-actions.ts` |
| Phone (Twilio Verify client) | `lib/sms/twilio-verify.ts` |
| E.164 + country list | `lib/phone/e164.ts` |
| Phone actions | `app/account/verifyPhone/actions.ts` |
| Phone UI (country + OTP boxes) | `components/profile/PhoneVerification.tsx` |
| Settings section | `components/account/VerificationSection.tsx` |
| Phone gate | `lib/authz/verification-guard.ts` |
| Auth DB helpers | `lib/db/auth.ts` |

---

## Database

Migration: `db/migrations/0004_verification_timestamps.sql` (additive, nullable, no backfill, no data rewrite).

```sql
alter table public.users
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz;
```

Mirrored in `prisma/schema.prisma` (`User.emailVerifiedAt`, `User.phoneVerifiedAt`).

**Reused, not recreated:**
- `users.phone_e164` (unique) — the phone number.
- `auth_verification_tokens` (hash-only, `type`, `expires_at`, `used_at`, `created_at`) — the email-verify tokens. No new `EmailVerificationToken` model was needed.
- `users.has_email_verified` / `has_mobile_verified` + `profiles.email_verified` / `phone_verified` — the verified state (source of truth).

`auth_phone_otp` is now **unused** (Twilio Verify replaced the custom OTP) but is left in place — dropping it is a separate, optional cleanup.

Apply on an existing DB:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0004_verification_timestamps.sql
npx prisma generate
```

---

## Flow

### Email
1. Sign up → account created, `has_email_verified = false`.
2. A random 32-byte token is generated; **only its SHA-256 hash** is stored, 24h expiry.
3. Branded email (Resend) links to `/verify-email?token=…`.
4. Visiting the link redeems the token (single-use, race-safe), sets `has_email_verified = true` + `email_verified_at`, and invalidates any other outstanding links.
5. Page renders one of: **success / already verified / expired / invalid / check-inbox**.
6. **Resend** (rate-limited) and **change email before verification** are available; every send invalidates prior unused tokens.

### Phone
1. Authenticated user enters a number with a country selector → normalized to E.164.
2. Server calls **Twilio Verify** to send an SMS OTP (nothing stored locally).
3. User enters the 6-digit code (paste / auto-advance supported).
4. Server checks the code with Twilio Verify; on `approved`, sets `has_mobile_verified = true`, `phone_e164`, `phone_verified_at`.
5. Duplicate numbers are rejected (a number can belong to one account).

### Phone-gated actions (shared web + mobile service layer)
Required before: **publishing a listing** (`createListingAs`), **confirming an order** (`confirmOrderAs`, which unlocks both parties' contact details). **Not** required for browsing, login, signup, or viewing listings.

---

## Security

- **Email tokens:** cryptographically random (32 bytes), **only the SHA-256 hash stored**, 24h expiry, **single-use** (atomic `updateMany` guard, race-safe), prior tokens invalidated on each new send.
- **OTP:** never generated or stored by us — Twilio Verify owns it. Max 5 check attempts / 15 min per user (plus Twilio's own throttling).
- **Rate limits:** email resend and OTP send both 60s cooldown + 3 / 15 min; OTP checks 5 / 15 min.
- **Generic responses:** email-change never reveals whether an address is registered; login/reset messaging unchanged.
- **Secrets:** Twilio auth token / service SID and Resend key stay server-side; never returned to the client.
- **CSRF:** state-changing operations are Server Actions / same-origin POSTs (Auth.js + Next protections). Email verification is a GET link secured by the unguessable token itself.
- **Audit logging:** `logger.audit` / `logger.security` on send, verify, change, and rate-limit events.
- **Google OAuth:** unchanged and already correct — `lib/auth/oauth.ts` trusts Google's `email_verified` claim only to link/create accounts (blocks link-by-email when `email_verified === false`), per Auth.js guidance.

> Note: GET-based email links can be pre-fetched by email security scanners, which may consume a token before the user clicks. This matches the specified `/verify-email?token=` contract; if it becomes a problem, switch to a one-click POST confirmation page.

---

## Required environment variables

| Variable | Used for | Status |
|----------|----------|--------|
| `RESEND_API_KEY` | Sending email (Resend) | already set in `.env.local` |
| `EMAIL_FROM` | Email "from" (defaults to `onboarding@resend.dev`) | **set for production** (verified domain) |
| `NEXT_PUBLIC_SITE_URL` | Absolute verification links (defaults to `http://localhost:3000`) | **set for production** |
| `TWILIO_ACCOUNT_SID` | Twilio auth | **required for phone** |
| `TWILIO_AUTH_TOKEN` | Twilio auth | **required for phone** |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service (`VA…`) | **required for phone** |

If Resend is unset, email sending is skipped (logged), not fatal. If Twilio is unset, phone verification returns a generic "try again later" and the UI degrades gracefully.

### Resend setup
1. Create a Resend account and verify your sending domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Query & Buy <no-reply@yourdomain.com>`).
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin so links are absolute.

### Twilio Verify setup
1. In the Twilio Console: **Verify → Services → Create** (this yields the `VA…` Service SID).
2. Enable the **SMS** channel; optionally customize the code length / template / sender.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.
4. No `twilio` npm package is needed — we call the Verify v2 REST API directly.

---

## Deployment

1. Apply `db/migrations/0004_verification_timestamps.sql` to the target database.
2. `npx prisma generate` (build step / `postinstall` already runs it).
3. Set the environment variables above.
4. Deploy. Existing sessions and logins are unaffected (no session/JWT shape change).

---

## Testing

```bash
npm run test:unit          # DB-free: E.164, rate limits, Twilio Verify mapping (fetch stubbed)
npm run test:verification  # DB-backed: email token lifecycle + phone gate (needs local DATABASE_URL)
npm run test:authz         # regression: existing authorization suite
npm run test:api           # regression: existing mobile API suite
npm run typecheck          # tsc --noEmit
npm run check:boundaries   # DB import-boundary guard
```

`test:verification` / `test:authz` / `test:api` require `DATABASE_URL` pointing at a **local** target DB built from `db/baseline` (never production).

---

## Rollback

The feature is additive and safe to roll back in layers:

- **Disable phone gate:** revert `lib/authz/verification-guard.ts` usage in `lib/listings/write.ts` + `lib/orders/service.ts` (publish/confirm stop requiring phone). No data change.
- **Disable sending:** unset `RESEND_API_KEY` (email) / the `TWILIO_*` vars (phone) — flows degrade gracefully.
- **Full revert:** `git revert` the feature commits on `feature/email-phone-verification`. The `email_verified_at` / `phone_verified_at` columns can be left in place (nullable, unused) or dropped separately; the booleans remain the source of truth throughout, so trust/authz is unaffected either way.
