-- ============================================================================
-- 20260624110001_extensions_enums_helpers
-- Extensions, enum types, and table-independent helper functions.
-- Source: database-design.md §0, §2.0
-- ============================================================================

-- ---------- extensions ----------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists postgis;    -- geography(Point) for listing pins
create extension if not exists vector;     -- pgvector: similar-product embeddings
create extension if not exists pg_trgm;    -- fuzzy text (trigram) search
create extension if not exists citext;     -- case-insensitive email column

-- ---------- enums ----------
create type user_status        as enum ('active','suspended','banned','deleted');
create type app_role           as enum ('user','moderator','admin','super_admin');
create type emirate            as enum ('dubai','abu_dhabi','sharjah','ajman',
                                        'umm_al_quwain','ras_al_khaimah','fujairah');
create type listing_status     as enum ('draft','pending_review','active','sold',
                                        'expired','rejected','deleted');
create type listing_condition  as enum ('new','like_new','used','for_parts');
create type verification_type  as enum ('mobile','email','emirates_id');
create type verification_status as enum ('pending','verified','failed','expired','rejected');
create type conversation_status as enum ('open','archived','blocked');
create type report_target      as enum ('listing','user','message');
create type report_reason      as enum ('scam','prohibited','spam','offensive',
                                        'wrong_category','counterfeit','other');
create type report_status      as enum ('open','reviewing','actioned','dismissed');
create type admin_action_type  as enum ('approve_listing','reject_listing','remove_listing',
                                        'suspend_user','ban_user','reinstate_user',
                                        'verify_user','dismiss_report','other');

-- ---------- generic updated_at trigger function ----------
-- References no app tables, so it is safe to create before them.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
