-- ============================================================================
-- 20260624110024_realtime
-- Add the trust-layer tables to the supabase_realtime publication so the UI can
-- subscribe and update without a refresh. Idempotent (skips tables already in
-- the publication).
-- ============================================================================

do $$
declare
  t text;
  tbls text[] := array['messages', 'offers', 'orders', 'notifications', 'reviews'];
begin
  foreach t in array tbls loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
