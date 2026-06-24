# Changelog

All notable architectural and project-level decisions for Query & Buy.

---

## 2026-06-23 — Architecture standardized (Phase 1 / MVP)

**Decision:** Query & Buy MVP standardized on:

- Next.js 15
- TypeScript
- Tailwind
- Shadcn UI
- Supabase
- Vercel
- Anthropic Claude API

**Rejected:**

- NestJS
- OpenSearch

**Context:** ARCHITECTURE.md previously carried an exploratory NestJS + OpenSearch design. For a solo founder optimizing for fastest development, lowest cost, and production readiness at the first 10,000 users, the Supabase-first stack was selected. NestJS and OpenSearch are retained only as post-MVP scaling options. See [ARCHITECTURE.md](ARCHITECTURE.md) §0.5 "Rejected Alternatives (Phase 1)" and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## 2026-06-23 — AI provider finalized

**Decision:** Phase 1 uses **Anthropic Claude** as the primary AI provider (resolves the earlier OpenAI-vs-Claude inconsistency in favor of Claude). Model tiers: `claude-haiku-4-5` (cheap classification / search parse), `claude-sonnet-4-6` (vision photo→listing, default), `claude-opus-4-8` (hard reasoning).

**Rationale:** The entire AI design — vision photo→listing, structured-output attribute extraction, and conversational-search parsing — was built around Claude. Claude is the approved provider for all Phase 1 AI features.

**Future flexibility:** The AI layer should be provider-agnostic, accessed through an abstraction (`packages/llm`). Future versions may support OpenAI or other providers without changing product code.
