# Query & Buy — UI Specification

> A premium UAE marketplace experience. Design-only spec — no code.
> Sized for the data model in [database-design.md](database-design.md) and the flows in [ARCHITECTURE.md](ARCHITECTURE.md).

**Design lineage**
- **Airbnb** — photo-forward cards, warmth, trust signals woven into every surface, search that feels effortless.
- **Apple** — typographic clarity, generous whitespace, restraint, motion that explains rather than decorates.
- **Stripe** — precision and calm in dense/admin surfaces; data made legible, never cramped.

The synthesis: *Airbnb on the consumer side, Stripe on the admin side, Apple holding the whole thing to a higher bar.*

---

## 0. Design Language (the foundation every page inherits)

**Grid & spacing.** 12-column fluid grid, 1200px max content width, 24px gutters desktop / 16px mobile. Spacing scale on a 4px base (4, 8, 12, 16, 24, 32, 48, 64). Whitespace is a feature, not a gap to fill.

**Typography.** One humanist sans for Latin (e.g. Inter / SF-like), paired with a high-quality Arabic face (e.g. IBM Plex Sans Arabic) so AR and EN feel like one system. Scale: Display 40/48, H1 32/40, H2 24/32, H3 20/28, Body 16/24, Caption 13/18. Numerals tabular for prices.

**Color.** Calm, near-neutral base with one confident brand accent.
- Ink `#0B0B0F` · Surface `#FFFFFF` · Subtle `#F6F7F9` · Border `#E6E8EC`
- Brand `#1463FF` (trust-blue, used sparingly for primary action)
- Success `#0E9F6E` · Warning `#B45309` · Danger `#D92D20`
- Verified badge teal `#0FB5A6`; Urgent amber `#F59E0B`
- Dark mode is a first-class theme, not an afterthought.

**Elevation.** Flat by default; soft shadows only for floating/interactive layers (cards on hover, sheets, popovers). Radius 12px cards, 8px inputs/buttons, 999px pills.

**Motion.** 150–250ms ease-out for state; shared-element transition on card → detail (the image animates into place, Apple-style). Skeletons, never spinners, for content loads. Respect `prefers-reduced-motion`.

**Bilingual / RTL (non-negotiable for UAE).** Full mirroring in Arabic: layout direction, icon flips, alignment. Currency always **"AED 45,000"** with tabular figures; numbers stay LTR inside RTL text. Locale toggle (EN/ع) in the header persists per user.

**Trust system.** A reusable **Verified badge** (teal check) and **seller trust row** (response time, member-since, rating) appear consistently on cards, listings, profiles, and chat headers. Trust is the brand.

**Core components (shared library).** Top nav, search bar, listing card, filter chip/sheet, image gallery, button (primary/secondary/ghost/danger), input/select, segmented control, toast, modal, bottom sheet (mobile), empty-state block, skeleton, badge, avatar, price tag, map pin, pagination/infinite-scroll sentinel.

---

## 1. Homepage

**Purpose:** make a buyer feel "I can find anything here in seconds," and make a seller feel "selling is one tap away."

### Layout (desktop)
- **Sticky top nav:** logo · prominent **search bar** (AI conversational placeholder: *"Try: automatic Corolla under 30k in Sharjah"*) · category menu · locale toggle · Saved · Messages · Avatar/Sign-in · **Sell** (primary button, always visible).
- **Hero (restrained):** one line of value prop + the big search bar repeated at large scale, with **emirate selector** and quick category pills (Cars, Electronics, Furniture, Property…). Apple-like: lots of air, one focal action.
- **Category rail:** horizontally scrollable iconographic tiles.
- **"Urgent near you"** rail — amber-accented cards (`is_urgent` listings), location-aware.
- **Personalized rails** (signed-in): "Based on your searches", "Saved search has 3 new", "Similar to what you viewed".
- **Fresh listings grid:** photo-forward cards, infinite scroll.
- **Trust band:** "Verified sellers · Emirates ID checked · Report-and-review" — quiet, reassuring.
- **Footer:** categories, about, safety center, language, app stores.

### Components
Search bar (conversational), emirate selector, category pills + rail, listing card (image, price, title, emirate, verified badge, favorite heart), urgent card variant, section rail with "See all", sticky Sell button.

### Listing card anatomy (used everywhere)
Image (4:3, lazy, blurhash placeholder) · favorite heart (top-right) · price (AED, tabular) · title (1 line truncate) · emirate · verified badge · urgent pill if applicable · subtle hover lift + image zoom.

### User actions
Search (typed NL or tap category) · pick emirate · favorite a listing (optimistic heart) · open listing · tap **Sell** · switch language · sign in/up.

### Mobile layout
Sticky compact header (logo + search field that expands to full-screen search on focus). Category pills scroll horizontally. Single-column rails with horizontal scroll. **Bottom tab bar:** Home · Search · **Sell (center FAB)** · Messages · Profile. Sell is the thumb-reachable hero.

### Empty states
- New/anonymous user, no personalization yet → show curated "Popular in the UAE" + category explorer instead of a blank personalized rail.
- No urgent listings nearby → hide the rail entirely (never show an empty rail).

### Error states
- Feed fails to load → friendly inline block with illustration + **Retry**, categories still usable.
- Geolocation denied → fall back to a default emirate (Dubai) with a "Set your area" chip; never block the page.
- Offline → cached last feed with an "You're offline" banner.

---

## 2. Search Results

**Purpose:** Airbnb-grade browsing — fast, filterable, with the AI's interpretation visible and correctable.

### Layout (desktop)
- **Search header:** the query persists in the bar. Below it, **AI-interpreted filter chips** (e.g. `Cars` `Toyota` `Automatic` `Sharjah` `≤ AED 30,000`) — each removable/editable. This is the Stripe-like "show the system's reasoning" move: the user trusts results because they can see and fix the parse.
- **Two-pane:** left = results grid (2–3 cols), right = **sticky map** (PostGIS pins) with hover-sync between card and pin. Toggle to list-only.
- **Filter bar:** Category, Price range, Condition, Emirate/Area, Sort (Relevance · Newest · Price · Urgent first), plus "More filters" → category-specific attributes (make, mileage, size…) from `category_attributes`.
- **Result meta:** "1,240 results in Dubai" + active sort.
- **Save this search** button — prominent, ties into Saved Searches alerts.
- Infinite scroll with a "Back to top" affordance.

### Components
Editable filter chips, filter bar + "More filters" sheet, sort dropdown, results grid, map panel with clustered pins, listing card, **Save search** CTA, result-count meta, skeleton grid.

### User actions
Refine via chips · open filter sheet · change sort · hover card ↔ pin highlight · favorite · open listing · **save search** (→ name + notify toggle) · clear all filters.

### Mobile layout
Map hidden behind a **"Map" toggle button** (floating). Filters collapse into a single **Filters** button → full-height bottom sheet with sectioned controls and a sticky "Show X results" footer. Chips scroll horizontally under the search bar. Cards single-column.

### Empty states
- Zero results → "No matches for *automatic Corolla under 30k in Sharjah*." Offer: **loosen filters** (one-tap remove the most restrictive chip), broaden emirate, or **Save this search and get notified when something matches** (turns a dead end into a retained user).
- Over-filtered → highlight which chip is killing results.

### Error states
- Search service down → "Search is having a moment." Retry + fall back to category browse.
- Partial map failure → results still render; map area shows a compact "Map unavailable" tile.
- Slow query → skeleton cards + subtle progress; never a blank screen.

---

## 3. Listing Detail

**Purpose:** Airbnb-level desire + trust. Beautiful imagery, all the facts, zero friction to contact.

### Layout (desktop)
- **Gallery (hero):** large primary image + thumbnail strip; click → full-screen lightbox with keyboard nav. Shared-element zoom from the card.
- **Two-column body:**
  - **Left (content):** Title (EN/AR) · price (large, tabular) + "Negotiable" tag · condition · key attributes as a clean spec grid · description · location map (approximate pin, area-level for privacy) · **Similar products** rail (pgvector neighbors).
  - **Right (sticky action card):** price · **Message seller** (primary) · **Save** (heart) · **Share** · seller mini-card (avatar, name, **Verified badge**, rating, response time, member-since, "View profile") · **Report listing** (quiet ghost link). Urgent listings show an amber countdown ("Urgent — ends in 2d 4h").
- **Safety note:** subtle "Meet in public, never pay in advance" tip near the contact action.

### Components
Image gallery + lightbox, price block, spec/attribute grid, description, approximate map, seller trust card, sticky contact panel, similar-products rail, report affordance, urgent countdown, breadcrumb.

### User actions
Browse gallery · message seller (→ opens/creates conversation) · save · share (native share / copy link) · view seller profile · report · open similar listing · (owner viewing own listing) **Edit / Mark as sold / Promote (Urgent)**.

### Mobile layout
Full-bleed swipeable gallery with paged dots. Content stacks. The action card becomes a **sticky bottom bar**: price (left) + **Message** (right, primary) + heart. Tapping price/Message can raise a bottom sheet. Spec grid becomes two-up rows.

### Empty / edge states
- Listing has only one image → gallery shows single image gracefully (no empty thumbnails).
- No "similar products" yet (new/embedding pending) → hide the rail.
- Seller not yet verified → show "Identity not verified" neutral state (not alarming), still allow contact.

### Error states
- Listing not found / deleted → dedicated page: "This listing is no longer available" + **Browse similar in [category]**.
- Listing sold/expired → banner overlay "Sold" / "No longer active"; contact disabled, similar rail emphasized.
- Image load failure → graceful placeholder, retains layout.
- Not signed in & taps Message → inline auth sheet (phone OTP), returns to the same action after login (no context loss).

---

## 4. Create Listing

**Purpose:** deliver the brand promise — **a listing in under 60 seconds** via AI photo-to-listing. The flow must feel like magic, with the human always in control.

### Layout (desktop) — guided, stepped, but fast
A calm single-column flow (max ~720px) with a slim progress indicator. Apple-like focus: one decision per moment.

**Step 1 — Photos (the magic moment).**
Large drag-and-drop / tap-to-upload zone (1–8 photos). On upload: thumbnails with reorder + cover-photo selection, per-image upload progress. A reassuring line: *"We'll write your listing for you."* → triggers `ai_listing_jobs`.

**Step 2 — AI draft review.**
While processing: an elegant **skeleton of the form filling in** (not a spinner) — fields animate in as AI returns them. Result: pre-filled **Title (EN + AR), Category, Description, Attributes, Condition**. Low-confidence fields are gently highlighted ("Double-check this") rather than blocking. Everything is editable.

**Step 3 — Price.**
Price input with an **AI suggested range** shown as a band ("Most sell for AED 28,000–32,000") and a "Use suggested" chip. Negotiable toggle.

**Step 4 — Location & details.**
Emirate (required) + area, optional precise pin.

**Step 5 — Boost (optional).**
**Urgent Sale Mode** toggle with duration + clear benefit copy ("Top of search, amber badge, alerts to matching buyers"). Price shown if paid.

**Step 6 — Review & publish.**
Preview exactly as buyers will see the card + detail. **Publish** primary. New sellers see "Goes live after a quick review."

### Components
Photo uploader (drag/reorder/cover), AI-draft form with confidence highlights, category picker (search + tree), attribute fields (dynamic per category), price input + suggestion band, emirate/area picker + map, urgent toggle, live preview, progress stepper, save-as-draft.

### User actions
Upload/reorder/delete photos · accept or edit AI fields · pick/correct category · apply suggested price · set location · toggle urgent · **save draft** · **publish** · regenerate AI draft.

### Mobile layout
Full-screen stepped flow, one step per screen, large thumb-friendly controls, camera-first capture. Sticky bottom action ("Next" / "Publish"). Photo step uses native camera/library. The AI fill-in animation is the emotional peak — keep it smooth on mobile.

### Empty states
- No photos yet → inviting upload zone with examples + the 60-second promise.
- Saved drafts exist → entry point shows "Continue your draft" card.

### Error states
- AI generation fails → graceful fallback to a **manual form** (never a dead end): "Couldn't auto-fill — add details yourself or **Try again**." Photos preserved.
- Image rejected by safety check → inline "This photo can't be used" with reason, remove + replace; rest of flow intact.
- Upload failure (network) → per-image retry, others unaffected, draft auto-saved.
- Validation (missing required field) → inline field errors, scroll-to-first-error, publish button explains what's missing.
- Listing limit / unverified seller cap reached → explain + path to verify (Emirates ID) to raise limits.

---

## 5. User Profile

**Purpose:** the public **seller trust surface** (Airbnb host-profile energy) and, for the owner, an account hub.

### Layout (desktop) — public view
- **Header card:** avatar · display name · **Verified badge** · rating (avg + count) · member-since · response time · emirate · **Message** + **Report** actions.
- **Tabs:** **Listings** (their active grid) · **Reviews** · **About**.
- Listings tab = the same card grid, filterable by category/status (active only for public).

### Owner view (additional)
- **Account hub** entry (separate from public profile): My Listings (with status filters: Active · Draft · Pending · Sold · Expired), Saved searches, Favorites, **Verification center** (mobile ✓ / email / Emirates ID ladder with progress), Settings (language, notifications, privacy/data — PDPL "download my data" / "delete account"), Payments/Promotions history.
- Each owned listing card gets quick actions: Edit · Mark sold · Promote · Delete · view stats (views, saves, messages).

### Components
Profile header/trust card, rating display, tabbed nav, listing grid with status filters (owner), verification-ladder widget, settings list, data-rights controls, message/report actions.

### User actions
**Public:** message seller · view listings · read reviews · report user.
**Owner:** edit profile (name, avatar, bio, emirate) · manage listings · start/continue verification · change language · manage notifications · **download data / delete account** · sign out.

### Mobile layout
Header card stacks; tabs become a segmented control or swipeable tabs. Owner account hub is a clean settings-style list (iOS-grouped feel). Verification ladder is a vertical stepper.

### Empty states
- Seller with no active listings (public) → "No active listings right now" + link to other sellers / category.
- Owner, never listed → big friendly "List your first item" CTA (ties to the 60s flow).
- No reviews yet → "No reviews yet — be the first to deal with [name]."

### Error states
- Profile load fail → retry block, keep nav.
- Avatar upload fail → revert + inline error, keep old avatar.
- Verification submission error → preserve progress, explain, retry; never lose uploaded docs silently.
- Account-deletion flow → explicit confirmation with consequences (irreversible, listings removed), typed confirmation, success + grace-period note.

---

## 6. Messages

**Purpose:** trustworthy buyer↔seller chat (one thread per listing+buyer), real-time, with safety baked in.

### Layout (desktop) — two-pane
- **Left: conversation list** — each row: counterpart avatar + name + verified badge, listing thumbnail, last message preview, timestamp, unread dot/count. Search/filter (All · Unread · Buying · Selling).
- **Right: active thread** — header (counterpart + **listing context card** pinned at top: thumb, title, price, "View listing") · message stream (bubbles, day separators, read receipts) · composer (text, image attach, send). Quick-reply chips ("Is this available?", "Last price?", "Can I see it today?").
- **Safety:** subtle persistent banner first time ("Keep payments & meetups safe — never pay in advance"). Flagged/scam messages get an inline caution.
- **Header actions:** Mark sold (seller), Block, Report, Archive.

### Components
Conversation list row, thread header with listing context card, message bubble (sent/received/system), read receipt, day divider, composer + attachments, quick-reply chips, safety banner, block/report/archive menu, typing indicator, unread counters.

### User actions
Open thread · send text/image · use quick reply · view linked listing · mark sold · block/report/archive · search conversations · (real-time) receive + read.

### Mobile layout
Two screens: **list** → **thread** (full-screen, back button). Listing context card collapses to a slim pinned bar. Composer sticks above keyboard; attach via sheet. Push notifications deep-link into the thread.

### Empty states
- No conversations → "Your messages will appear here. Start by contacting a seller." + browse CTA.
- Thread with no messages yet (just created) → show the listing context + a prompt ("Say hi to [seller]") with quick-reply chips.
- Search no results → "No conversations match."

### Error states
- Message send fails → bubble shows "Failed — tap to retry", message preserved locally, optimistic UI rolls back gracefully.
- Realtime disconnected → quiet "Reconnecting…" chip; queue outbound, deliver on reconnect.
- Blocked thread → composer disabled with explanation.
- Attachment too large / unsafe → inline reject with reason.
- Counterpart account suspended → system message "This user is no longer active," composer disabled.

---

## 7. Saved Searches

**Purpose:** turn intent into retention — the alert engine that brings buyers back.

### Layout (desktop)
- **List of saved searches** as cards: the human-readable query ("Automatic Corolla ≤ AED 30,000 · Sharjah"), the parsed filter chips, **match count + "X new since last visit"** badge, notification toggle (Push/Email/Off), last-run time.
- Each card: **Run search** (→ Search Results pre-filled), **Edit filters**, **Rename**, **Delete**, **New matches** preview (3 thumbnails).
- Top: "Create a search alert" CTA + explainer ("We'll notify you the moment something matches — including urgent sales.").

### Components
Saved-search card, parsed-filter chip set, new-match badge + thumbnail preview, notification channel toggle, run/edit/rename/delete actions, create-alert CTA.

### User actions
Run · edit filters (opens Search with chips) · rename · toggle notifications/channel · delete · open a new match · create new alert.

### Mobile layout
Single-column cards. Notification toggle inline. Swipe actions (edit/delete). New-match thumbnails scroll horizontally. Tap card = run search.

### Empty states
- None saved → illustrated "Never miss the right deal" + "Save a search from any results page" with a one-tap example.
- Saved but zero matches so far → "We're watching — no matches yet. We'll ping you the moment one appears." (reassure, don't read as failure.)

### Error states
- Alert delivery/permission off → banner "Turn on notifications to get alerts" + enable shortcut.
- Failed to load saved searches → retry block.
- Edited search now matches nothing → warn before save ("This will rarely match — save anyway?").

---

## 8. Admin Dashboard

**Purpose:** Stripe-grade operational clarity for staff — moderation, users, analytics. Calm, dense-but-legible, fast. Separate auth domain, RBAC-gated (`moderator` / `admin` / `super_admin`), every action audited to `admin_actions`.

### Layout (desktop) — app shell
- **Left sidebar nav:** Overview · **Moderation queue** · Reports · Listings · Users · Verifications (KYC) · Analytics · Audit log · Settings. Role-aware (moderators see less than admins).
- **Top bar:** environment/role indicator, global search (user/listing by id/phone), staff avatar + 2FA status.
- **Overview:** Stripe-style KPI cards (Active listings, New today, Pending moderation, Open reports, New users, Verified rate) with sparklines; a "Needs attention" queue summary.

### Key views
- **Moderation queue:** prioritized table of listings needing review (source: AI / report / new seller) with **AI verdict + reasons** shown inline. Row → side panel with images, details, seller trust, and one-click **Approve / Reject (reason) / Remove / Escalate**. Keyboard shortcuts (j/k, a/r) for speed. Bulk select.
- **Reports:** table by status/reason/target; open → context + resolve actions; links to the offending listing/user/message.
- **Users:** searchable table (status, verified, trust score, listings count, joined). Detail → activity, listings, reports against, verification status; actions **Suspend / Ban / Reinstate / Verify** (with mandatory reason → writes `admin_actions`).
- **Verifications (KYC):** queue of `verification_requests`; reviewer sees minimal PII (privacy by design), Approve/Reject. Sensitive fields access-logged.
- **Analytics:** listings created, GMV-proxy, conversations, search trends, urgent uptake, verification funnel — clean charts, date-range, emirate/category filters, export.
- **Audit log:** immutable, append-only feed of `admin_actions` (who/what/when/why), filterable — the accountability backbone.

### Components
App shell (sidebar + topbar), KPI card with sparkline, data table (sort, filter, paginate, bulk, column controls), detail side-panel/drawer, decision action bar with reason capture, AI-verdict chip, status badges, chart cards, date-range picker, global command search, role/2FA indicators.

### User actions (role-gated)
Triage & decide on listings · resolve reports · suspend/ban/reinstate users · approve/reject KYC · manage categories (admin) · grant roles (admin/super_admin) · view analytics · export · search globally. Every mutating action requires a reason and is audited.

### Mobile / responsive
Admin is desktop-first (operational tool). Responsive down to tablet for triage on the go: sidebar collapses to icons, tables become priority-ordered cards, decision actions move to a bottom action bar. Phone = read-only essentials + urgent approvals only.

### Empty states
- Moderation queue empty → "All clear — nothing to review." (a *good* empty state; calm, even rewarding.)
- No open reports → "No open reports."
- Analytics, no data in range → "No activity in this period" + adjust range.
- Search no match → "No user or listing found for '…'."

### Error states
- Data/table load fail → inline retry per panel (don't blank the whole shell).
- Action conflict (item already actioned by another mod) → "This was just handled by [name]" + refresh row (prevents double-moderation).
- Permission denied (role too low) → clear "You don't have access to this action" rather than a hidden failure.
- Session/2FA expired → re-auth modal without losing the current view/context.
- Bulk action partial failure → per-row result summary ("12 done · 2 failed — retry these").

---

## 9. Cross-cutting states & accessibility

**Loading.** Skeletons everywhere (cards, forms, tables); shimmer, not spinners. Optimistic UI for favorites, messages, filter changes.

**Global errors.** A consistent error-block pattern (illustration + plain-language cause + primary recovery action). Never expose stack traces or codes to users. Toasts for transient confirmations; inline for field/section errors.

**Offline / flaky network (real in mobile UAE usage).** Cache last feed and threads; queue writes (messages, favorites) and sync on reconnect; clear "offline" indicator.

**Auth interruptions.** Any action requiring login raises an inline OTP sheet and **returns the user to their exact intent** afterward (message draft, favorite, save search) — no lost context.

**Accessibility.** WCAG 2.1 AA: 4.5:1 contrast, full keyboard nav + visible focus rings, semantic landmarks, screen-reader labels (incl. Arabic), 44px min touch targets, `prefers-reduced-motion` honored, never color-only signaling (verified/urgent carry icon + text).

**Performance feel (Apple bar).** Sub-second perceived loads via skeletons + image blurhash; image lazy-loading + CDN; shared-element transitions; no layout shift (reserved media aspect ratios).

---

## 10. Page → data mapping (sanity check against the schema)

| Page | Primary tables (read) | Key writes |
|---|---|---|
| Homepage | listings, categories, profiles, favorites, saved_searches | favorites |
| Search Results | listings (+FTS/geo/attrs), listing_images | saved_searches |
| Listing Detail | listings, listing_images, profiles, price_suggestions, listing_embeddings | conversations, favorites, reports |
| Create Listing | categories, ai_listing_jobs, price_suggestions | listings, listing_images |
| User Profile | profiles, listings, verification_requests | profiles, verification_requests |
| Messages | conversations, messages, listings, profiles | messages, conversations, reports |
| Saved Searches | saved_searches, listings | saved_searches |
| Admin Dashboard | reports, listings, users, verification_requests, admin_actions | admin_actions (+ gated mutations) |

Every screen's trust elements (verified badge, ratings) read from `profiles`; every privileged admin mutation lands in `admin_actions`. The UI never assumes access the RLS layer would deny — empty/error states above are written to match what each role can actually see.
```
