/** Build a public URL for an object in a public Supabase Storage bucket. */
export function publicUrl(bucket: string, key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${key}`
}

export const LISTING_IMAGES_BUCKET = 'listing-images'
