/**
 * lib/object-storage — entry point for the S3-compatible (Cloudflare R2) layer.
 * ===========================================================================
 * `publicUrl` is pure (no env, no client) so it works in client components and
 * render paths; each bucket is served from its own R2 custom domain (see
 * keys.ts#bucketPublicUrl). `getStorageDriver()` is lazy and only constructs the
 * S3 client (for presigned uploads / deletes) on first use.
 */
import { S3StorageDriver } from '@/lib/object-storage/s3'
import type { StorageDriver } from '@/lib/object-storage/driver'
import { bucketPublicUrl, type BucketName } from '@/lib/object-storage/keys'

export * from '@/lib/object-storage/keys'
export type { StorageDriver, PresignedUpload } from '@/lib/object-storage/driver'
export { S3StorageDriver } from '@/lib/object-storage/s3'

/**
 * Public URL for a public-bucket object, served from the bucket's R2 custom
 * domain (avatars.queryandbuy.com / images.queryandbuy.com). Pure — no env.
 */
export function publicUrl(bucket: BucketName | string, key: string): string {
  return bucketPublicUrl(bucket as BucketName, key)
}

let cached: StorageDriver | undefined

/**
 * The shared storage driver, built lazily from env on first use. Public reads
 * go through the R2 custom domains (publicUrl above), so the driver only needs
 * S3 credentials — NOT a public base URL.
 */
export function getStorageDriver(): StorageDriver {
  if (cached) return cached
  const { STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY } =
    process.env
  if (!STORAGE_ENDPOINT || !STORAGE_REGION || !STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY) {
    throw new Error('Object storage env is not fully configured; see lib/object-storage/README.md.')
  }
  cached = new S3StorageDriver({
    endpoint: STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  })
  return cached
}
