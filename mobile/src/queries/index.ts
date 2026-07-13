/**
 * src/queries — TanStack Query hooks over the /api/v1 client.
 * DTO types come from @qb/shared (the same contract the server validates).
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { FeedListingDto } from '@qb/shared'

export const keys = {
  feed: (filters: Record<string, string>) => ['listings', filters] as const,
  featured: ['listings', 'featured'] as const,
  listing: (id: string) => ['listing', id] as const,
  categories: ['categories'] as const,
  favorites: ['favorites'] as const,
  me: ['me'] as const,
}

export type CategoryDto = { id: string; slug: string; name_en: string; listingCount: number }

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api<{ categories: CategoryDto[] }>('/categories', { anonymous: true }),
    staleTime: 10 * 60_000,
  })
}

export function useFeaturedListings() {
  return useQuery({
    queryKey: keys.featured,
    queryFn: () => api<{ listings: FeedListingDto[] }>('/listings/featured', { anonymous: true }),
    staleTime: 60_000,
  })
}

type FeedPage = { listings: FeedListingDto[]; count: number; nextOffset: number | null }

/** Infinite feed. `filters` are the @qb/shared ListingFilters query params. */
export function useListingFeed(filters: Record<string, string>) {
  return useInfiniteQuery({
    queryKey: keys.feed(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ ...filters, offset: String(pageParam), limit: '24' })
      return api<FeedPage>(`/listings?${params}`, { anonymous: true })
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  })
}

export type ListingDetailResponse = {
  listing: {
    id: string
    title_en: string
    description: string
    price_fils: number
    currency: string
    condition: string
    emirate: string | null
    area: string | null
    status: string
    is_negotiable: boolean
    view_count: number
    published_at: string | null
    images: { storage_key: string; position: number }[]
    seller: { id: string; display_name: string; username: string | null; avatar_url: string | null; badge_level: string } | null
  }
  similar: FeedListingDto[]
  isFavorited: boolean
}

export function useListing(id: string) {
  return useQuery({
    queryKey: keys.listing(id),
    queryFn: () => api<ListingDetailResponse>(`/listings/${id}`),
    enabled: !!id,
  })
}

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: keys.favorites,
    queryFn: () => api<{ listings: FeedListingDto[] }>('/favorites'),
    enabled,
  })
}

/** Optimistic favorite toggle: flips detail + favorites caches, rolls back on error. */
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (listingId: string) =>
      api<{ favorited: boolean }>(`/favorites/${listingId}/toggle`, { method: 'POST' }),
    onMutate: async (listingId) => {
      await qc.cancelQueries({ queryKey: keys.listing(listingId) })
      const prev = qc.getQueryData<ListingDetailResponse>(keys.listing(listingId))
      if (prev) {
        qc.setQueryData(keys.listing(listingId), { ...prev, isFavorited: !prev.isFavorited })
      }
      return { prev }
    },
    onError: (_e, listingId, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.listing(listingId), ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.favorites })
    },
  })
}

export type ParsedSearch = {
  query: string | null
  filters: { category?: string; emirate?: string; condition?: string; min?: string; max?: string; sort?: string }
  aiUsed: boolean
}

export function parseSearch(text: string): Promise<ParsedSearch> {
  return api<ParsedSearch>('/search/parse', { body: { text } })
}
