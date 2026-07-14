/**
 * lib/object-storage/keys — bucket definitions, key conventions, upload
 * validation (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * Pure. Encodes the two buckets exactly as they exist in Supabase today
 * (migrations 110011 avatars, 110013 listing-images) plus the storage-object
 * RLS rule "first path segment = the owner's id" — which, with no storage RLS
 * on the target, becomes an application check performed here at presign time.
 *
 * Key conventions are preserved byte-for-byte so migrated objects and existing
 * DB references (listing_images.storage_key) keep working:
 *   avatars/{userId}/{ts}.{ext}
 *   listing-images/{userId}/{group}/{i}.{ext}
 */
export const BUCKETS = {
  avatars: {
    name: 'avatars',
    public: true,
    maxBytes: 2 * 1024 * 1024, // 2 MB (migration 110011)
  },
  listingImages: {
    name: 'listing-images',
    public: true,
    maxBytes: 5 * 1024 * 1024, // 5 MB (migration 110013)
  },
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]['name']

/**
 * Public read URL for an object. Each bucket is served from its own Cloudflare
 * R2 custom domain — the single source of truth for public URLs (no env var).
 * These are the only two public buckets.
 */
export function bucketPublicUrl(bucket: BucketName, key: string): string {
  switch (bucket) {
    case 'avatars':
      return `https://avatars.queryandbuy.com/${key}`
    case 'listing-images':
      return `https://images.queryandbuy.com/${key}`
    default:
      throw new Error(`Unknown storage bucket: ${bucket as string}`)
  }
}

/** The image MIME types both buckets allow (migrations 110011 / 110013). */
export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number]

const EXT_BY_MIME: Record<AllowedImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function bucketConfig(bucket: BucketName) {
  return bucket === 'avatars' ? BUCKETS.avatars : BUCKETS.listingImages
}

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)
}

export interface UploadRequest {
  contentType: string
  sizeBytes: number
}

export type ValidationError =
  | { ok: false; reason: 'mime' | 'size' }
  | { ok: true }

/** Enforce the per-bucket MIME allowlist + size cap (was a Supabase bucket setting). */
export function validateUpload(bucket: BucketName, req: UploadRequest): ValidationError {
  if (!isAllowedImageMime(req.contentType)) return { ok: false, reason: 'mime' }
  if (req.sizeBytes <= 0 || req.sizeBytes > bucketConfig(bucket).maxBytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

/** avatars key: `{userId}/{ts}.{ext}` (mirrors components/profile/AvatarUploader.tsx). */
export function avatarKey(userId: string, mime: AllowedImageMime, ts: number): string {
  return `${userId}/${ts}.${EXT_BY_MIME[mime]}`
}

/** listing-images key: `{userId}/{group}/{index}.{ext}` (mirrors the sell/edit forms). */
export function listingImageKey(userId: string, group: string, index: number, mime: AllowedImageMime): string {
  if (!SAFE_SEGMENT.test(group)) throw new Error('Invalid listing image group segment.')
  return `${userId}/${group}/${index}.${EXT_BY_MIME[mime]}`
}

/**
 * The former storage RLS check `(storage.foldername(name))[1] = auth.uid()` —
 * an object's first path segment must be the acting user's id. Enforced in the
 * presign action and before any delete.
 */
export function keyBelongsToUser(key: string, userId: string): boolean {
  const first = key.split('/')[0]
  return first.length > 0 && first === userId
}
