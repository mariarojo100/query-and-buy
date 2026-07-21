# `lib/object-storage` — storage layer (Cloudflare R2)

> **Status: live in production.** All images (avatars, listing photos) upload to
> and read from **Cloudflare R2**. Uploads use presigned PUTs; public reads are
> served from two dedicated R2 custom domains. `lib/storage.ts` re-exports
> `publicUrl` from here for the render sites.

## Public URLs — two-domain architecture

Each public bucket is served from its **own** R2 custom domain, hard-wired in
`keys.ts#bucketPublicUrl` (the single source of truth — **no env var**):

| Bucket | Public domain |
|---|---|
| `avatars` | `https://avatars.queryandbuy.com/<key>` |
| `listing-images` | `https://images.queryandbuy.com/<key>` |

`publicUrl(bucket, key)` (index.ts) and the driver's `publicUrl()` both delegate
to it, so there is no `NEXT_PUBLIC_STORAGE_BASE_URL` — the driver needs only S3
credentials.

## Contents

| File | Role |
|---|---|
| `keys.ts` | Bucket defs (`avatars` 2 MB, `listing-images` 5 MB), the image-MIME allowlist, key builders, upload validation, and `keyBelongsToUser` — the former storage-RLS rule `(storage.foldername(name))[1] = auth.uid()` as an app check. Pure. |
| `driver.ts` | The `StorageDriver` interface (`presignPut`, `put`, `remove`, `publicUrl`). |
| `s3.ts` | S3-compatible driver — one implementation for R2 / S3 / MinIO. |
| `index.ts` | Lazy driver singleton (`getStorageDriver()`) + pure `publicUrl()` (mirrors `lib/storage.ts#publicUrl`). |

## The upload model change

Today the **browser** uploads directly to Supabase Storage, gated by storage
RLS (3 components: CreateListingForm, EditListingForm, AvatarUploader). With no
storage RLS on the target, uploads become **presigned PUT**: a server action
authenticates the viewer, validates MIME/size (`validateUpload`) and confines
the key to `{viewer.id}/…` (`keyBelongsToUser`), then returns a presigned URL
the browser PUTs to. That server action + the component rewrites are the Phase 5
**wiring**, not part of this foundation.

## Preserved conventions

Bucket names and key layouts are byte-for-byte identical
(`avatars/{userId}/{ts}.{ext}`, `listing-images/{userId}/{group}/{i}.{ext}`), so
migrated objects and existing `listing_images.storage_key` values keep working.
`profiles.avatar_url` (which stores a full URL) was rewritten during data
migration to the `avatars.queryandbuy.com` domain.

## Env

`STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`,
`STORAGE_SECRET_ACCESS_KEY` (see `.env.example`) — used only by
`getStorageDriver()` to sign uploads/deletes, read lazily on first use. Public
read URLs need **no** env: they come from the fixed R2 custom domains in
`keys.ts#bucketPublicUrl`.
