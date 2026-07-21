'use server'

/**
 * My-listings actions — lifecycle (sold / delete / pause) + edit. The edit
 * path is a thin wrapper over the shared listing-write service so the mobile
 * API enforces the same validation, safety + contact re-screen, verification,
 * and facet coercion (lib/listings/write.ts).
 */
import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import {
  markListingSoldFor,
  softDeleteListingFor,
  setListingPausedFor,
  type ListingImageInput,
} from '@/lib/db/listings'
import { updateListingAs, type ListingWriteInput } from '@/lib/listings/write'

type Result = { ok?: boolean; error?: string; blocked?: boolean; categories?: string[]; needVerify?: boolean }

function revalidateListing(id: string) {
  revalidatePath('/account/listings')
  revalidatePath('/')
  revalidatePath(`/listing/${id}`)
}

/** Mark an active listing as sold. Owner-only. */
export async function markSold(id: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await markListingSoldFor(viewer, id))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

/** Soft-delete: status='deleted' + deleted_at. Owner-only. */
export async function softDeleteListing(id: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await softDeleteListingFor(viewer, id))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

/** Pause (active → draft) or resume (draft → active). Owner-only. */
export async function setListingPaused(id: string, paused: boolean): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await setListingPausedFor(viewer, id, paused))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

export type UpdateListingInput = ListingWriteInput & { id: string }
export type { ListingImageInput }

/** Update a listing — thin wrapper over the shared listing-write service. */
export async function updateListing(input: UpdateListingInput): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const res = await updateListingAs(viewer, input)
  if (res.error) return { error: res.error, blocked: res.blocked, categories: res.categories, needVerify: res.needVerify }
  revalidateListing(input.id)
  return { ok: true }
}
