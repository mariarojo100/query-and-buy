/**
 * lib/db/savedSearches — Viewer-scoped saved-searches repository (Phase 4).
 * Replaces the `saved_owner_all` RLS policy with explicit userId=viewer.id
 * scoping. Mutations use *Many with an owner guard so a non-owner's call
 * affects zero rows (returns false), never another user's data.
 */
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'
import type { Viewer } from '@/lib/authz/viewer'
import type { SavedFilters } from '@/lib/savedSearches/filters'

export type SavedSearch = {
  id: string
  label: string | null
  query_text: string | null
  parsed_filters: SavedFilters
  notify: boolean
  created_at: string
}

export async function savedSearchesFor(viewer: Viewer): Promise<SavedSearch[]> {
  const rows = await db.savedSearch.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, queryText: true, parsedFilters: true, notify: true, createdAt: true },
  })
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    query_text: r.queryText,
    parsed_filters: (r.parsedFilters ?? {}) as SavedFilters,
    notify: r.notify,
    created_at: r.createdAt.toISOString(),
  }))
}

export async function createSavedSearchFor(
  viewer: Viewer,
  input: { label: string; queryText: string | null; parsedFilters: SavedFilters; notify: boolean },
): Promise<void> {
  await db.savedSearch.create({
    data: {
      userId: viewer.id,
      label: input.label,
      queryText: input.queryText,
      parsedFilters: input.parsedFilters as Prisma.InputJsonValue,
      notify: input.notify,
    },
  })
}

/** Returns true iff a row owned by the viewer was affected. */
export async function deleteSavedSearchFor(viewer: Viewer, id: string): Promise<boolean> {
  const r = await db.savedSearch.deleteMany({ where: { id, userId: viewer.id } })
  return r.count > 0
}

export async function renameSavedSearchFor(viewer: Viewer, id: string, label: string): Promise<boolean> {
  const r = await db.savedSearch.updateMany({ where: { id, userId: viewer.id }, data: { label } })
  return r.count > 0
}

export async function setSavedSearchNotifyFor(viewer: Viewer, id: string, notify: boolean): Promise<boolean> {
  const r = await db.savedSearch.updateMany({ where: { id, userId: viewer.id }, data: { notify } })
  return r.count > 0
}
