# Query & Buy — DESIGN.md

The single source of truth for the Query & Buy visual system ("Ink & Sand").
Tokens live in `app/globals.css`; this document explains them and sets the rules.
If a design decision isn't captured here, it should be added here — not improvised
in a component.

## Brief
- **Brand:** Query & Buy — the UAE's marketplace for quality pre-owned items.
- **Audience:** Everyday buyers and sellers across the Emirates (Dubai, Abu Dhabi,
  Sharjah). Broad consumer, mobile-first, value- and trust-driven.
- **Page goal (home):** get people searching/browsing fast, and nudge sellers to
  list (photo → AI draft → publish).
- **Tone:** warm, premium, trustworthy, human, calm. Confident, never shouty.
- **Stack:** Next.js 15 (App Router, RSC) · Tailwind v4 · shadcn/ui.

## Direction (taste)
A warm editorial marketplace: ivory "paper" ground, deep warm ink, one restrained
bronze accent. **Type and spacing carry the design** — big confident Fraunces for
display, clean Hanken Grotesk for everything else. Substance over decoration: show
real listings and real content density; don't lean on effects.

This was validated against the ui-ux-pro-max engine, which independently resolved
the same palette (ink `#1C1917` + gold `#A16207` + sand `#FAFAF9`) and an editorial
serif direction for a "Marketplace / Directory" pattern. We deliberately rejected
its "Liquid Glass" style suggestion (glass/blur hurts contrast + perf and reads as
generic) and its uppercase-mono kicker idea (see Anti-slop below).

## Tokens (see `app/globals.css` for the authoritative oklch values)
**Color roles** (light; dark mode defined alongside each):
- `--background` warm sand paper · `--card` warm white (floats on paper)
- `--foreground` deep warm ink · `--muted-foreground` muted ink (secondary text)
- `--primary` ink (the premium CTA / dark panels) · `--primary-foreground` cream
- `--gold` bronze — the one signature accent (focus ring, small accents, hovers)
- `--success` trust teal (verified/success ONLY) · `--destructive` warm red
- `--border` warm hairline · `--secondary`/`--accent` faint warm washes

**Type**
- Display: **Fraunces** (`--font-serif`, `.font-display` / `.display-hero`), weights
  400–700, optical sizing on. Used big; tight tracking (-0.021 to -0.03em).
- UI / body: **Hanken Grotesk** (`--font-sans`), 1.6 line-height.
- Mono: JetBrains Mono (`--font-mono`) — reserved for literal code only (e.g. /sell
  snippet). **Not** for labels, eyebrows, prices.

**Radii:** `--radius` 0.75rem; scale `sm/md/lg/xl/2xl/3xl` derived. Cards use
`rounded-2xl`; pills `rounded-full`.
**Shadows (elevation):** `.shadow-soft` (resting cards) → `.shadow-float` (hover /
raised). `.ring-gold` champagne hairline for premium panels. No ad-hoc shadows.
**Spacing:** 4/8px rhythm; section vertical padding `py-8 sm:py-11`; page container
`max-w-6xl` with `px-5 sm:px-8`.

## Type scale
- Hero: `.display-hero` → `clamp(3rem, 7.5vw, 5.25rem)`, leading 0.96 (size baked
  into the CSS class so it survives a stale Tailwind build cache).
- Section title: `.font-display` `text-[1.9rem] sm:text-[2.6rem]`, under a hairline.
- Card/section body: 15–18px Hanken. Small label (`.eyebrow`): 13px, sentence case.
- Prices/specs: `.tnum` tabular numerals (Hanken), never mono.

## Components (home)
- **Navbar** `SiteHeader`: logo · location · natural-language search (the primary
  CTA) · Browse/Sell + icons. Sticky, solid.
- **Hero** `HomeHero`: one headline (`Find it. Buy it. Love it.`, one ink
  treatment), subcopy, the search box, a "list from a photo" card (warm card +
  bronze camera, not a purple "AI" promo), trending chips. Right: real listings.
- **Sections** via `SectionHeading` (title + hairline rule): Browse by category ·
  trust band · Recently added · How it works (camera → pen → send) · Why panel
  (ink) · final CTA.
- **Card** `ListingCard`: photo, price (tabular), title, facet line (e.g.
  `16GB · 512 GB · SSD`), location + verified. Quiet badges (Used / Featured),
  sentence case.

## Anti-slop (hard rules — this brand's definition of "AI slop")
- **No off-palette color.** Only the tokens above; the accent is bronze `--gold`.
  No violet/purple/indigo/neon. (Purple "AI" chrome is the #1 generated-site tell.)
- **No uppercase-tracked or mono labels / eyebrows.** Sentence case, sans, no wide
  tracking. A label is a quiet signpost, not a chip.
- **No italic serif accent words** in headlines. Same font + same colour.
- **No ✨/🚀 (Sparkles/Rocket) or emoji icons.** Lucide, grounded + literal.
- **No "reimagined by AI" / buzzword copy.** Lead with the benefit.
- **No HUD/wireframe/glass tropes:** no cyan wireframes, pulsing rings, neon trails,
  glassmorphism, decorative gradients.
- **Substance over art.** Prefer real listings/content and density over big empty
  "arty" compositions.

## References
Refero MCP isn't connected in this environment, so references are grounded in the
ui-ux-pro-max engine results + established editorial-commerce patterns (warm paper
grounds, oversized serif display, calm catalog grids). Patterns are adapted, never
cloned. Add concrete Refero links here when the MCP is available.

## Motion
Restrained by brand choice (substance over art). Allowed:
- A single entrance on the hero (`.animate-rise`, ~0.55s ease-out).
- Lightweight, dependency-free scroll reveals via `IntersectionObserver` (see
  `AnimatedCounter` for the pattern) — subtle fade/rise only.
- Hover: `.lift` (translateY -4px + shadow) on cards; 150–300ms.
**Not allowed:** GSAP/Three.js/3D icons, parallax, scroll-jacking, pinned sections,
decorative-only motion. All motion must respect `prefers-reduced-motion` (handled
globally in `globals.css`).
