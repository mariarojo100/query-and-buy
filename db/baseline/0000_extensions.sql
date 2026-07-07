-- ============================================================================
-- 0000_extensions.sql — extension bootstrap for the self-managed target DB
-- Part of MIGRATION_TASKS.md Phase 1. Run as a superuser (or rds_superuser /
-- provider equivalent) BEFORE 0001_schema.sql. Everything else runs as the
-- unprivileged migrator role (queryandbuy_migrator).
--
-- Matches supabase/migrations/20260624110001_extensions_enums_helpers.sql.
-- The chosen Postgres host MUST support all five (notably postgis + pgvector).
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists postgis;   -- listings.location geography(Point,4326)
create extension if not exists vector;    -- listing_embeddings.embedding vector(1024)
create extension if not exists pg_trgm;   -- trigram index on profiles.display_name
create extension if not exists citext;    -- users.email, profiles.username
