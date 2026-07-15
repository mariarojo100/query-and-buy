'use server'

import { getViewer } from '@/lib/auth/session'
import {
  presignAvatarUploadAs,
  presignListingUploadsAs,
  type PresignRequest,
  type PresignedSlot,
} from '@/lib/object-storage/uploads'

/**
 * Presigned-upload actions (Phase 5) — thin wrappers over
 * lib/object-storage/uploads.ts (shared with the mobile API). The service
 * validates MIME/size and confines keys to `{viewer.id}/…`.
 */

export type { PresignRequest, PresignedSlot }

/** One presigned slot for an avatar upload + the public URL it will live at. */
export async function getAvatarUploadUrl(
  req: PresignRequest,
): Promise<{ slot?: PresignedSlot; publicUrl?: string; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return presignAvatarUploadAs(viewer, req)
}

/** Presigned slots for a set of listing images (ordered). Keys share a group id. */
export async function getListingUploadUrls(
  reqs: PresignRequest[],
): Promise<{ slots?: PresignedSlot[]; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return presignListingUploadsAs(viewer, reqs)
}
