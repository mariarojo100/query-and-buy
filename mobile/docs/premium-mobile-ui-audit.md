# Query & Buy — Premium Mobile UI Audit

Branch: `design/premium-mobile-app-refresh` (off `mobile/foundation`)
Stack: Expo 54 · React Native 0.81 · expo-router 6 · NativeWind 4 · Reanimated 4 · TanStack Query 5
Verified on: Expo **web** build (`:8082`) via the local web-verify harness (API `:3000` → CORS proxy `:3001`). No iOS/Android emulator on this machine.

## Root-cause finding (the "overly dark / generic" complaint)
The app is **already a well-architected, light-first marketplace** in code. The perceived "generic near-black theme" is the app **defaulting to dark mode** (`userInterfaceStyle: 'automatic'` + OS/browser dark preference), where the dark tokens are near-black and **flat** — `background-dark #121411` vs `card-dark #1D211C` have almost no luminance separation, so surfaces don't read as layered. In light mode the same screens already look like a credible marketplace.

**Direction:** rebuild the dark palette with real layered deep-emerald surfaces (canvas < sunken < surface < elevated) so the primary experience is never an "unfinished dark developer theme"; elevate the light system into a warmer, more art-directed identity; keep dark mode available (do not remove the feature). Fix the concrete screen issues below.

## Route / screen inventory (`app/`)
- `(tabs)/` — index (Home), explore, sell, inbox, account, favorites(hidden)
- `(auth)/` — login, signup
- `listing/[id]`, `search`, `sell/new`, `conversation/[id]`, `user/[username]`
- `account/` — edit, listings, notifications, delete

## Shared presentation surface
- `src/theme/colors.ts` (icon/nav color constants) · `tailwind.config.js` (token source of truth) · `src/theme/typography.ts` (Inter weight→family patch)
- `src/components/ui.tsx` — ScalePressable, PrimaryButton, Field, EmptyState, skeletons, ErrorState, BrandMark, Badge, Chip, SectionHeader, Skeleton
- `src/components/ListingCard.tsx` — the marketplace card

## High-impact visual problems (confirmed live)
1. **Flat dark theme is the default** — surfaces don't separate; reads as generic dark startup. (#1)
2. **Oversized hero** — "Find almost anything." consumes the top third before any marketplace content.
3. **Category duplication/labels** — Vehicles + Cars both shown; "Apartments…" truncated. (Data-driven — fix presentation only, not records.)
4. **Plain category tiles** — pale-green circles, low contrast, generic.
5. **Oversized floating Sell FAB** — raised green circle pasted on a default tab bar.
6. **Default tab bar** — hairline top border, no art direction; FAB collides with last content row on Explore.
7. Competent-but-generic identity — could be any emerald marketplace; lacks surface layering, elevation, and a deliberate type scale.

## Current strengths (preserve)
Real data binding throughout · image-first cards with graceful no-photo fallback · listing detail is a strong conversion screen (full-bleed gallery, counter, spec card, sticky action bar) · skeletons/empty/error states exist · Inter typography · haptics · favorite toggle.

## Functional boundaries — MUST NOT CHANGE
Business/offer/reservation/contact-unlock/order logic · API contracts · auth/authorization · route names & navigation destinations · category/listing data. Untracked WIP (phone-verification) at repo root must stay untouched. This is a **frontend-only** refresh.

## Redesign priority
1. Design tokens (dark rebuild + light elevation + surface/elevation/type scale) → cascades everywhere.
2. Shared primitives (buttons, field, chip, badge, card, section header, empty/error/skeleton).
3. App shell: tab bar + Home.
4. Product card system.
5. Explore/search + listing detail.
6. Remaining screens as time permits (reported honestly).

## Baseline screenshots
Captured in-session (light + dark) for Home, Explore, Listing detail. Dark-mode Home is the clearest illustration of the root cause.
