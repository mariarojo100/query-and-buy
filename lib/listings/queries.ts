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
