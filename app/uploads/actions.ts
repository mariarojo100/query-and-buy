'use server'

import { randomUUID } from 'node:crypto'
import { getViewer } from '@/lib/auth/session'
import {
  getStorageDriver,
  validateUpload,
  avatarKey,
  listingImageKey,
  publicUrl,
  isAllowedImageMime,
  type AllowedImageMime,
} from '@/lib/object-storage'

/**
 * Presigned-upload actions (Phase 5). Replaces the browser-direct Supabase
 * Storage uploads: the server authenticates the viewer, validates MIME/size,
 * confines the object key to `{viewer.id}/…` (the old storage-RLS rule, now an
 * app check), and returns a presigned PUT URL for the browser to upload to.
 */

export type PresignRequest = { contentType: string; sizeBytes: number }
export type PresignedSlot = { url: string; key: string; headers: Record<string, string> }

function sizeError(reason: 'mime' | 'size', maxLabel: string): string {
  return reason === 'mime' ? 'Unsupported image type (PNG, JPEG, WebP or GIF only).' : `Image too large (max ${maxLabel}).`
}

/** One presigned slot for an avatar upload + the public URL it will live at. */
export async function getAvatarUploadUrl(
  req: PresignRequest,
): Promise<{ slot?: PresignedSlot; publicUrl?: string; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const v = validateUpload('avatars', req)
  if (!v.ok) return { error: sizeError(v.reason, '2 MB') }
  if (!isAllowedImageMime(req.contentType)) return { error: sizeError('mime', '2 MB') }

  const key = avatarKey(viewer.id, req.contentType, Date.now())
  const slot = await getStorageDriver().presignPut({ bucket: 'avatars', key, contentType: req.contentType })
  return { slot: { url: slot.url, key: slot.key, headers: slot.headers }, publicUrl: publicUrl('avatars', key) }
}

/** Presigned slots for a set of listing images (ordered). Keys share a group id. */
export async function getListingUploadUrls(
  reqs: PresignRequest[],
): Promise<{ slots?: PresignedSlot[]; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (reqs.length === 0) return { error: 'Add at least one photo.' }
  if (reqs.length > 8) return { error: 'Up to 8 photos.' }

  const group = randomUUID()
  const drv = getStorageDriver()
  const slots: PresignedSlot[] = []
  for (let i = 0; i < reqs.length; i++) {
    const req = reqs[i]
    const v = validateUpload('listing-images', req)
    if (!v.ok) return { error: sizeError(v.reason, '5 MB') }
    if (!isAllowedImageMime(req.contentType)) return { error: sizeError('mime', '5 MB') }
    const mime: AllowedImageMime = req.contentType
    const key = listingImageKey(viewer.id, group, i, mime)
    const slot = await drv.presignPut({ bucket: 'listing-images', key, contentType: mime })
    slots.push({ url: slot.url, key: slot.key, headers: slot.headers })
  }
  return { slots }
}
