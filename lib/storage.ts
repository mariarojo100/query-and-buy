/**
 * Public storage URLs. Delegates to the object-storage layer, which serves each
 * bucket from its Cloudflare R2 custom domain (see lib/object-storage/index.ts#
 * publicUrl → keys.ts#bucketPublicUrl).
 */
export { publicUrl } from '@/lib/object-storage'

export const LISTING_IMAGES_BUCKET = 'listing-images'
