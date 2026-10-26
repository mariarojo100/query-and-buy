# Query & Buy — Homepage Design Direction

Single source of truth for this redesign pass. Tokens live in `app/globals.css`;
this file records the *why* and the taste decisions so the homepage reads as a
deliberate editorial product, not an AI landing-page template.

## Brief
- **Brand:** Query & Buy — the UAE's marketplace for pre-owned goods.
- **Audience:** UAE buyers & sellers (Dubai/Abu Dhabi-led, all 7 emirates), mobile-first, bargain-aware, trust-sensitive.
- **Goal of the page:** make a visitor instantly feel *there is a huge amount of good stuff here, it's local and trustworthy, and I can find or sell in seconds* — then search or browse.
- **Tone words:** confident · editorial · warm · precise · alive (not loud, not cute, not "AI-reimagined").
- **Stack:** Next.js 15 (App Router, RSC) · Tailwind v4 · shadcn · next/font.

## The slop we are killing
The homepage kept reading as "AI slop / beginner." Root causes, now addressed:
1. Centered-box hero template (kicker → centred headline → centred search → centred chips). The single most AI-generated shape. → replaced with an editorial masthead sitting on a live inventory wall.
2. Thin inventory. A marketplace's energy *is* its stock; showing 3–5 images reads as a mock-up. → a dense, varied-size editorial grid of real listings high on the page.
3. Landing-page tropes: pill-chip rows, three icon+label "proof points," soft gradients everywhere, cliché copy ("Find it. Buy it. Love it."). → removed / reduced to one honest line; imagery and type carry the page.
4. Generic trendy display type (Bricolage). → a decisive retail-editorial superfamily.

## Direction (taste decisions)
- **Imagery carries the colour.** Chrome stays warm-neutral paper + ink + hairlines; the product photos supply all the saturation. (Ref: Zara / Nike / Airbnb galleries.)
- **Restraint carried by surfaces.** Depth from paper tone, one hairline, one soft shadow — not decoration. (Ref: Adam Lippes atelier.)
- **Masthead type on warm paper.** Oversized, tight, confident display; technical details (price, condition, location) set with precision like a dossier. (Ref: Pravah / Miranda broadsheet.)
- **Accent reserved strictly for actions & recognition** — bronze on CTAs, focus, "featured". Never decorative. (Ref: Airbnb coral.)
- **Density = life.** Vary cell sizes (a true editorial grid, not a uniform card wall) so it reads curated, not generated.

## Tokens
Palette unchanged — the "Ink & Sand" oklch system (warm sand paper, deep ink, single bronze `--gold`, functional teal for trust). No off-palette colour. See `app/globals.css` `:root`.

### Typography — CHANGED (Refero-grounded: Faire / Medium / Beautiful)
Every strong editorial-*marketplace* reference uses the same formula: a refined
**serif headline** + a clean **sans body** on warm paper. That contrast is the
identity. (Earlier sans-display attempts — Bricolage, Archivo — read generic
precisely because they skipped it.)
- **Display (`--font-serif` slot, `.font-display` / `.display-*`):** **Fraunces** — a warm old-style serif with real character and optical sizing (opsz tracks the size, so headlines get the display cut automatically). Weight 600. Leads every headline. *Not* used as italic accent words (that specific move is the AI tell, per house rule — a full serif masthead is not).
- **UI / body (`--font-sans`):** **Figtree** — a clean humanist grotesque that recedes under the serif. Replaces Archivo/Hanken.
- **Mono (`--font-mono`):** JetBrains Mono — code/IDs only.
- Sentence case. No uppercase-tracked-mono eyebrows.

### Surfaces — CHANGED
Flat, hairline-first (Faire/Palmer discipline): depth from a warm hairline
border, not glow. Shadows dialled back. Radius tightened to `0.5rem` base so
cards read editorial, not like fat SaaS bubbles. Search stays a full pill.

### Type scale (baked clamps so they survive stale deploy cache)
- `.display-hero` — clamp(3rem, 7.5vw, 5.75rem), weight 800, tracking -0.03em, lh 0.92
- `.display-md` — clamp(2rem, 4.4vw, 3.5rem), weight 700, tracking -0.025em, lh 1.0
- `.font-display` — weight 700, tracking -0.015em

### Radii / shadow / spacing
- radius 0.75rem base; cards rounded-2xl. Shadows: `.shadow-soft`, `.shadow-float` (unchanged, warm-tinted).
- Section rhythm on the new scale: hero `pt-5/8`; inventory wall directly under; sections `py-10/14`.

## Motion
- Easing `cubic-bezier(0.21, 0.68, 0.25, 1)`; durations 250–600ms.
- `.animate-rise` entrance (opacity + 10px). Staggered reveal on the inventory wall (CSS stagger via per-cell delay). Image hover: slow `scale-[1.05]` over 900ms.
- Honour `prefers-reduced-motion` (already global in globals.css).
- **No GSAP, no Three.js, no 3D icons.** For a utility marketplace these would be the slop, not the wow — the wow is type + real inventory + precise restraint. (Skill's heavy-motion defaults deliberately declined.)

## References (Refero MCP, 2026-10-26)
Full styles pulled and synthesised (reference lock):
- **Primary — Faire** (`79142100…`, faire.com): warm artisanal *marketplace*. Canvas off-white `#fbf8f6`, ink text, fog-gray hairline borders, sturdy sans (Graphik) + distinct serif headline (Nantes), accent (Market Yellow) **decorative only, never on actions**, CTAs ink-black, cards 4px radius + hairline, split hero + product grid, 48px section gaps. → our structural + surface foundation.
- **Borrowed — Medium** (`4784cf2e…`): "digital ink on vellum" — stately serif headline (GT Super) + clean sans (Söhne) on warm off-white, black pill CTAs, accent reserved for illustration only. → confirms the serif-masthead/sans-body contrast *is* the identity; don't add a second serif.
- **Borrowed — Beautiful™** (`80f49900…`): creamy canvas, distinctive serif headline (Gascogne) + sans body, single warm accent reserved strictly for primary CTA, soft imagery. → accent discipline.
- **Context — Palmer** (`66430c0f…`): Canvas Creme gallery, flat surfaces, depth from imagery + hairlines not shadow. → surface restraint.
- **Rejected:** violet accents (Shop.app/Graf Lantz), fat rounded-2xl + heavy shadows, pill-chip clutter, uppercase-mono eyebrows, italic-serif accent words. Kept Ink & Sand bronze as the single, action-only accent (not yellow/coral — brand rule).

## Hero redesign (2026-10-26, "best marketplace" pass)
The two-column "serif text left + image right" hero read as a SaaS landing page,
not a marketplace (rejected repeatedly). Refero marketplace screens (Faire home,
Pattern Brands) show the right pattern: a **compact colored brand band / rich
hero that is search-forward**, then straight into category tiles + a dense
product grid — the inventory is the page.
- New hero = a **deep-pine hero panel** (rounded, contained): cream Fraunces
  headline, one short line, a **big prominent search** (the primary action),
  category quick-chips, a small honest trust line. Dark-on-porcelain contrast is
  the "wow"; search-forward + dense wall below = unmistakably a marketplace.
- Dropped the rotating `HeroCover` from the hero (the product wall carries the
  imagery). Accent stays pine; CTAs/search ink-or-cream. No eyebrows.

## What's being built
1. Fonts swapped to the Archivo superfamily (`layout.tsx`, `globals.css`).
2. Hero: oversized confident headline + the smart search as the single hero action + one honest trust line. Pill-chip clutter removed.
3. Inventory wall: a dense, varied-size editorial grid of real listings directly under the hero — the page's energy.
4. Category tiles, trust, how-it-works, CTA retained, re-tuned to the new type scale.
5. Verified in a DB-free preview harness at 375/768/1280/1920, then removed before commit.
