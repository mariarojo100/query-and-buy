// Prisma 7 configuration (see prisma/README.md).
// The database connection is used ONLY by Prisma CLI tooling (validate,
// db pull, migrate diff). No application runtime code connects through
// Prisma yet — Supabase remains the live stack during the migration.
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Placeholder default lets schema-only commands (validate/format/generate)
    // run without a real database configured.
    url:
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/queryandbuy',
  },
})
