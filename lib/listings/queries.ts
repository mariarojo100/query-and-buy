import { getViewer } from '@/lib/auth/session'
import * as repo from '@/lib/db/listings'

export type {
  SellerMini,
  FeedListing,
  ListingDetail,
  MyListing,
  EditListing,
  CategoryLite,
  SortKey,
  ListingFilters,
} from '@/lib/db/listings'

// Public feeds (only ever return active, non-deleted listings) — no viewer needed.
export const getFilteredListings = repo.filteredListings
export const getFeaturedListings = repo.featuredListings
export const getListingsByIds = repo.listingsByIds
export const getSimilarListings = repo.similarListings
export const getSellerListings = repo.sellerListings
export const getActiveCategories = repo.activeCategories
export const getCategoryCounts = repo.categoryCounts
export const getCategoryBySlug = repo.categoryBySlug

/**
 * Ancestor trail for a category slug, top-level first, ending with the category
 * itself — e.g. Property → Apartments for Sale. Used to build full breadcrumb
 * hierarchies (Home › Property › Apartments for Sale › Dubai) instead of the
 * flat Home › Category › City trail. Walks parent_id within the supplied
 * category list (already loaded on the page), so it costs no extra query.
 */
export function categoryAncestry(
  categories: repo.CategoryLite[],
  slug: string,
): { name: string; slug: string }[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]))
  const byId = new Map(categories.map((c) => [c.id, c]))
  const start = bySlug.get(slug)
  if (!start) return []
  const trail: { name: string; slug: string }[] = []
  let cur: repo.CategoryLite | undefined = start
  let guard = 0
  while (cur && guard++ < 6) {
    trail.unshift({ name: cur.name_en, slug: cur.slug })
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return trail
}

/** All of the current user's listings (owner-scoped). */
export async function getMyListings(): Promise<repo.MyListing[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return repo.myListings(viewer)
}

/** Fetch a listing for editing — owner only (null otherwise). */
export async function getListingForEdit(id: string): Promise<repo.EditListing | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  return repo.listingForEdit(viewer, id)
}

/** Single listing for the detail page, gated by the visibility policy. */
export async function getListingById(id: string): Promise<repo.ListingDetail | null> {
  // getViewer touches request cookies; fall back to anonymous (public visibility)
  // in build/ISR contexts where there is no request scope.
  let viewer: Awaited<ReturnType<typeof getViewer>> = null
  try {
    viewer = await getViewer()
  } catch {
    viewer = null
  }
  return repo.listingByIdVisible(viewer, id)
}
