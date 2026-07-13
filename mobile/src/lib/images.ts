/**
 * src/lib/images — public image URLs from storage keys.
 * Mirrors the server's publicUrl(): prefers the self-managed storage host
 * (EXPO_PUBLIC_STORAGE_URL), falls back to the Supabase public path that
 * production currently serves images from.
 */
import Constants from 'expo-constants'

const STORAGE_BASE: string =
  (Constants.expoConfig?.extra?.storageUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_STORAGE_URL ??
  'https://aqqctllrgskbyjufdrci.supabase.co/storage/v1/object/public'

export function listingImageUrl(key: string | null): string | null {
  if (!key) return null
  if (key.startsWith('http')) return key
  return `${STORAGE_BASE}/listing-images/${key}`
}

export function avatarUrl(urlOrNull: string | null): string | null {
  return urlOrNull
}
