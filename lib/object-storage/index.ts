/**
 * lib/object-storage — entry point (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * The target-stack replacement for lib/storage.ts. At cutover (Phase 5,
 * MIGRATION_TASKS §5) this directory becomes `lib/storage/` and the 11
 * publicUrl() call sites switch to importing `publicUrl` from here — the
 * signature is intentionally identical, so those sites don't otherwise change.
 *
 * `publicUrl` is pure (env only) so it works in client components and render
 * paths without constructing an S3 client. `getStorageDriver()` is lazy so
 * importing this module needs no storage credentials — the live app, which does
 * not use this yet, is unaffected when they are absent.
 */
import { S3StorageDriver } from '@/lib/object-storage/s3'
import type { StorageDriver } from '@/lib/object-storage/driver'
import type { BucketName } from '@/lib/object-storage/keys'

export * from '@/lib/object-storage/keys'
export type { StorageDriver, PresignedUpload } from '@/lib/object-storage/driver'
export { S3StorageDriver } from '@/lib/object-storage/s3'

/**
 * Public URL for a public-bucket object. The two live buckets are served from
 * their Cloudflare R2 custom domains; any other bucket falls back to the generic
 * storage host (NEXT_PUBLIC_STORAGE_BASE_URL) or a relative path.
 */
export function publicUrl(bucket: BucketName | string, key: string): string {
  switch (bucket) {
    case 'avatars':
      return `https://avatars.queryandbuy.com/${key}`

    case 'listing-images':
      return `https://images.queryandbuy.com/${key}`

    default: {
      const base = process.env.NEXT_PUBLIC_STORAGE_BASE_URL
      if (base) return `${base.replace(/\/$/, '')}/${bucket}/${key}`
      return `/${bucket}/${key}`
    }
  }
}
let cached: StorageDriver | undefined

/** The shared storage driver, built lazily from env on first use. */
export function getStorageDriver(): StorageDriver {
  if (cached) return cached
  const {
    STORAGE_ENDPOINT,
    STORAGE_REGION,
    STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_STORAGE_BASE_URL,
  } = process.env
  if (
    !STORAGE_ENDPOINT ||
    !STORAGE_REGION ||
    !STORAGE_ACCESS_KEY_ID ||
    !STORAGE_SECRET_ACCESS_KEY ||
    !NEXT_PUBLIC_STORAGE_BASE_URL
  ) {
    throw new Error('Object storage env is not fully configured; see lib/object-storage/README.md.')
  }
  cached = new S3StorageDriver({
    endpoint: STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    publicBaseUrl: NEXT_PUBLIC_STORAGE_BASE_URL,
  })
  return cached
}
