/**
 * Public storage URLs. Delegates to the target-stack object-storage layer,
 * which prefers NEXT_PUBLIC_STORAGE_BASE_URL and falls back to the Supabase
 * host until cutover (see lib/object-storage/index.ts#publicUrl).
 */
export { publicUrl } from '@/lib/object-storage'

export const LISTING_IMAGES_BUCKET = 'listing-images'
