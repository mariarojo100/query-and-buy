-- ============================================================================
-- RLS / security audit — run in the Supabase SQL editor (read-only).
-- Verifies Phase 3 claims against the LIVE database. Each query should return
-- ZERO rows for a clean bill of health (except the inventory query).
-- ============================================================================

-- 1) Any public table WITHOUT row level security enabled? (expect 0 rows)
select n.nspname as schema, c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by 2;

-- 2) Any RLS-enabled table with NO policies at all? (expect only intentionally
--    deny-all tables, e.g. listing_embeddings / email_failures / search_log)
select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename
  )
order by 1;

-- 3) Inventory: every policy, by table / command / roles. (review by eye)
select tablename, policyname, cmd, roles, qual is not null as has_using,
       with_check is not null as has_with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 4) Any policy granting broad write access to anon/public with no check?
--    (expect 0 — writes must be scoped to auth.uid()/owner)
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT','UPDATE','DELETE','ALL')
  and (with_check is null and qual is null)
order by 1;

-- 5) Storage buckets + their public flag and limits.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets order by id;

-- 6) Storage object policies (owner-scoping by path prefix).
select policyname, cmd, roles, qual is not null as has_using
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

-- 7) SECURITY DEFINER functions (RPCs) — confirm each is intended + safe.
select n.nspname as schema, p.proname as function, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef = true
order by 2;
