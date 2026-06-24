-- ============================================================================
-- 20260624110007_indexes
-- Performance indexes for the hot paths. Source: database-design.md §4
-- (uq_eid_hash lives with its table in §2.12 / migration 0006, not here.)
-- ============================================================================

-- users / profiles
create index idx_users_status        on public.users(status) where deleted_at is null;
create index idx_profiles_emirate     on public.profiles(emirate);
create index idx_profiles_name_trgm   on public.profiles using gin (display_name gin_trgm_ops);

-- categories
create index idx_categories_parent    on public.categories(parent_id);

-- listings: browse active, by category, by seller, geo, urgent, FTS, facets
create index idx_listings_status_pub  on public.listings(status, published_at desc)
                                       where status = 'active' and deleted_at is null;
create index idx_listings_category    on public.listings(category_id, status);
create index idx_listings_seller      on public.listings(seller_id);
create index idx_listings_emirate_cat on public.listings(emirate, category_id)
                                       where status = 'active';
create index idx_listings_geo         on public.listings using gist (location);
create index idx_listings_urgent      on public.listings(urgent_until)
                                       where is_urgent and status = 'active';
create index idx_listings_fts         on public.listings using gin (search_vector);
create index idx_listings_attrs       on public.listings using gin (attributes jsonb_path_ops);

-- similarity (pgvector ivfflat)
create index idx_embeddings_ivf       on public.listing_embeddings
                                       using ivfflat (embedding vector_cosine_ops) with (lists = 200);

-- images
create index idx_images_listing       on public.listing_images(listing_id, position);

-- messaging (inbox queries sort by recency)
create index idx_conv_seller          on public.conversations(seller_id, last_message_at desc);
create index idx_conv_buyer           on public.conversations(buyer_id, last_message_at desc);
create index idx_messages_conv        on public.messages(conversation_id, created_at desc);
create index idx_messages_unread      on public.messages(conversation_id) where read_at is null;

-- discovery / trust / safety
create index idx_saved_user           on public.saved_searches(user_id);
create index idx_saved_notify         on public.saved_searches(user_id) where notify;
create index idx_fav_user             on public.favorites(user_id, created_at desc);
create index idx_verif_user_type      on public.verification_requests(user_id, type);
create index idx_reports_status       on public.reports(status, created_at desc);
create index idx_reports_target       on public.reports(target_type, target_id);
create index idx_admin_actions_target on public.admin_actions(target_type, target_id, created_at desc);
create index idx_user_roles_lookup    on public.user_roles(user_id, role);
