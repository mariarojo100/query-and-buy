# Query & Buy Mobile — Release Checklist

Everything between here and the app stores. Items marked **[ACCOUNT]** need the
Apple Developer / Play Console / Expo accounts; everything else is done.

## 0. Hard prerequisites (blockers)

- [ ] **Deploy the `mobile/foundation` branch to production.** The app talks to
      `https://queryandbuy.com/api/v1/*`, which only exists on this branch.
      Also run `db/migrations/0003_api_tables.sql` on the prod DB and set
      `API_JWT_SECRET` (32+ chars) in the server env.
- [ ] **S3 storage env on prod** (`STORAGE_ENDPOINT/REGION/ACCESS_KEY_ID/`
      `SECRET_ACCESS_KEY`, `NEXT_PUBLIC_STORAGE_BASE_URL`) — sell-flow uploads
      fail without it (PRODUCTION_CUTOVER_RUNBOOK §5).
- [ ] **[ACCOUNT]** Apple Developer Program ($99/yr — approval takes days).
- [ ] **[ACCOUNT]** Google Play Console ($25 one-time).
- [ ] **[ACCOUNT]** Expo account (free) — `npx eas login`.

## 1. Identifiers & credentials

- [ ] **[ACCOUNT]** iOS: bundle id `ae.queryandbuy.app` in the Apple Developer
      portal (EAS can register it: `eas build` prompts).
- [ ] **[ACCOUNT]** Fill `TEAMID_PLACEHOLDER` in
      `public/.well-known/apple-app-site-association` with the Apple Team ID →
      redeploy web.
- [ ] **[ACCOUNT]** Android: after the first Play upload, copy the app-signing
      SHA-256 from Play Console → replace `SHA256_FINGERPRINT_PLACEHOLDER` in
      `public/.well-known/assetlinks.json` → redeploy web.
- [ ] **[ACCOUNT]** Google OAuth clients (iOS + Android) in Google Cloud →
      set `GOOGLE_MOBILE_CLIENT_IDS` (comma-sep) in the SERVER env; Apple
      sign-in: set `APPLE_BUNDLE_ID=ae.queryandbuy.app` in the SERVER env.
      (The endpoints are live; they just verify against these audiences.)
- [ ] **[ACCOUNT]** Fill `ASC_APP_ID_PLACEHOLDER` in `eas.json` (App Store
      Connect app id) after creating the app record.

## 2. Assets (quick design task)

- [ ] `mobile/assets/icon.png` (1024×1024, no alpha for iOS)
- [ ] `mobile/assets/adaptive-icon.png` (Android foreground, 1024×1024)
- [ ] `mobile/assets/splash.png` (2048×2048 centered logo)
      → reference them in `app.config.ts` (`icon`, `android.adaptiveIcon`,
      `expo-splash-screen` plugin).
- [ ] Screenshots: 6.7" iPhone + 6.5" iPhone + Pixel; capture Home, Search
      results, Listing, Chat with offer card, Sell flow. (Preview build +
      simulator is fine.)

## 3. Builds

```bash
cd mobile
npx eas login                                   # [ACCOUNT]
npx eas build --profile development --platform all   # dev client for device QA
npx eas build --profile preview --platform all       # shareable internal build
npx eas build --profile production --platform all    # store builds
```

## 4. Device QA (dev/preview build + the Maestro flows)

- [ ] `maestro test .maestro/` against a dev build (login, browse/favorite, search)
- [ ] Manual: sell flow with real photos (needs prod S3), chat + offer →
      accept → confirm → contact reveal (two accounts), push notification
      received + tap-routes correctly, universal link opens the app,
      block/report/delete-account, dark mode, small device (SE), large fonts.

## 5. Store listings

- [ ] App Store Connect + Play Console records (name: "Query & Buy —
      UAE Marketplace"), category: Shopping.
- [ ] Copy: see `mobile/store/listing.md`.
- [ ] Privacy: App Privacy (iOS) / Data Safety (Android) — we collect: email,
      name, phone (optional), user content (listings/messages/photos),
      approximate location NO, tracking NO. Data is linked to identity
      (account-based); no third-party ads.
- [ ] **Review notes (both stores)**: demo login demo@queryandbuy.ae /
      Demo!2026 (create on prod first); UGC moderation: in-app report + block
      + 24h moderation via /admin, AI pre-screen on listing creation; contact
      info gated behind mutual confirmation.
- [ ] iOS: Sign in with Apple is offered (required — Google present) ✓ built.
- [ ] Both: in-app account deletion ✓ built (`/account/delete`).

## 6. Submit

```bash
npx eas submit --platform ios --latest          # TestFlight → App Review
npx eas submit --platform android --latest      # Play internal → production
```

- [ ] TestFlight internal testers pass; Play internal track pass.
- [ ] Promote to review/production.

## 7. Post-launch

- [ ] Watch `email_failures` + server logs during hypercare.
- [ ] Rate-limit hardening: swap lib/security/rateLimit.ts to Upstash Redis
      (interface already isolated in lib/api/rateLimit.ts).
- [ ] Fast-follows: my-listings management screen, notifications center
      screen, saved searches, reviews write-flow, i18n extraction (AR/RTL),
      offline persistQueryClient cache, avatar upload from account/edit.
