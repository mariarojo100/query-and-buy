/**
 * lib/db — Prisma client singleton (MIGRATION FOUNDATION, not yet in runtime use)
 * ===========================================================================
 * This is the future data-access entry point for the self-managed-Postgres
 * target (MIGRATION_BLUEPRINT.md, TARGET_ARCHITECTURE.md §5). It is NOT wired
 * into any page, server action, route handler, or component yet — the live app
 * still runs entirely on Supabase via utils/supabase/*. Importing this module
 * has no effect until something calls a query on `db`.
 *
 * Boundary rule (enforced by scripts/check-db-boundaries.mjs, see lib/db/README.md):
 *   `@/lib/db` (this file) may only be imported from inside `lib/db/**`.
 *   Feature code gets a `Viewer`-scoped repository, never the raw client.
 *   This is what replaces Postgres RLS with application-level authorization.
 *
 * Prisma 7 connects through a driver adapter (no query engine binary). We use
 * the node-postgres adapter; the connection string comes from DATABASE_URL.
 */
import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // Thrown lazily on first real use, never at import time — keeps the app
    // (which does not use this yet) unaffected when DATABASE_URL is absent.
    throw new Error(
      'DATABASE_URL is not set. The Prisma data layer is part of the in-progress ' +
        'Supabase→self-managed migration and is not active yet; see lib/db/README.md.',
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// Cache across hot-reloads in dev so we don't exhaust connections.
const globalForDb = globalThis as unknown as { __qbPrisma?: PrismaClient }

let cached: PrismaClient | undefined = globalForDb.__qbPrisma

/**
 * The shared Prisma client. Lazily constructed on first property access so that
 * merely importing repositories under lib/db/ does not require DATABASE_URL.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!cached) {
      cached = createClient()
      if (process.env.NODE_ENV !== 'production') globalForDb.__qbPrisma = cached
    }
    return Reflect.get(cached, prop, receiver)
  },
})

export type { PrismaClient }
