# `lib/object-storage` — storage abstraction (migration foundation)

> **Status: scaffolding only, not wired into the running app.** The Phase 5
> ("foundation") slice of the Supabase→self-managed migration. Query & Buy still
> uploads to and reads from **Supabase Storage** via the browser client and
> `lib/storage.ts`. Nothing here is imported by a page, action, or component
> yet; it compiles and the offline parts are tested.

## Why `lib/object-storage` and not `lib/storage`

`lib/storage.ts` is the live runtime helper (imported as `@/lib/storage` by 11
render sites). A `lib/storage/` **directory** next to it would create import-
resolution ambiguity and risk breaking those. So the skeleton lives here; at
cutover it takes over the `lib/storage` name and the 11 `publicUrl` call sites
switch import path only (the signature is identical).

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
Only `profiles.avatar_url` (which stores a full URL) is rewritten during data
migration, from the Supabase host to `NEXT_PUBLIC_STORAGE_BASE_URL`.

## Env

`STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`,
`STORAGE_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_STORAGE_BASE_URL` (see `.env.example`).
All lazily read — importing this module needs none of them, so the live app is
unaffected while they are unset.
