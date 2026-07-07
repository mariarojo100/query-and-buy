/**
 * lib/object-storage/driver — the storage driver interface
 * (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * One small interface so the app depends on "object storage", not on S3, R2,
 * MinIO, or local disk specifically. The S3-compatible driver (s3.ts) covers
 * R2 / S3 / MinIO with one implementation; a local-disk driver can be added for
 * dev without touching callers.
 */
import type { BucketName, AllowedImageMime } from '@/lib/object-storage/keys'

export interface PresignedUpload {
  /** PUT the file bytes here (browser `fetch(url, { method: 'PUT', body })`). */
  url: string
  /** The object key the upload will live at (persist this / derive the public URL). */
  key: string
  /** Header the client must send so the signature matches. */
  headers: Record<string, string>
  expiresInSeconds: number
}

export interface StorageDriver {
  /** Presigned PUT for a browser-direct upload (replaces Supabase's RLS-gated upload). */
  presignPut(input: {
    bucket: BucketName
    key: string
    contentType: AllowedImageMime
    expiresInSeconds?: number
  }): Promise<PresignedUpload>

  /** Server-side upload (e.g. AI-generated images, migrations). */
  put(input: { bucket: BucketName; key: string; body: Uint8Array; contentType: string }): Promise<void>

  /** Delete an object (replaces `storage.from(bucket).remove([key])`). */
  remove(input: { bucket: BucketName; key: string }): Promise<void>

  /** Public URL for a public-bucket object (replaces lib/storage.ts#publicUrl). */
  publicUrl(bucket: BucketName, key: string): string
}
