/**
 * Listing schemas — mirror the DTOs in lib/db/listings.ts (FeedListing,
 * SellerMini) and the filter grammar in lib/listings/searchParams.ts.
 * The web drift guard (types/shared-contract-check.ts) pins these to the
 * repository types; the mobile app uses them for forms and response parsing.
 */
import { z } from 'zod'
import { CONDITION_VALUES, EMIRATE_VALUES, SORT_VALUES, UPLOAD_LIMITS } from '../constants'

export const SellerMiniSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  badge_level: z.string(),
  email_verified: z.boolean(),
})
export type SellerMiniDto = z.infer<typeof SellerMiniSchema>

export const FeedListingSchema = z.object({
  id: z.string().uuid(),
  title_en: z.string(),
  price_fils: z.number().int().nonnegative(),
  currency: z.string(),
  emirate: z.string().nullable(),
  area: z.string().nullable(),
  condition: z.string(),
  cover_key: z.string().nullable(),
  published_at: z.string().nullable(),
  is_featured: z.boolean(),
  view_count: z.number().int().nonnegative(),
  seller: SellerMiniSchema.nullable(),
})
export type FeedListingDto = z.infer<typeof FeedListingSchema>

/** GET /api/v1/listings query — mirrors ParsedSearch (lib/listings/searchParams.ts). */
export const ListingFiltersSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).optional(),
  emirate: z.enum(EMIRATE_VALUES as [string, ...string[]]).optional(),
  condition: z.enum(CONDITION_VALUES as [string, ...string[]]).optional(),
  minAed: z.coerce.number().positive().optional(),
  maxAed: z.coerce.number().positive().optional(),
  negotiable: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  sinceDays: z.coerce.number().pipe(z.union([z.literal(1), z.literal(7), z.literal(30)])).optional(),
  sort: z.enum(SORT_VALUES).default('newest'),
  offset: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(50).default(24),
})
export type ListingFilters = z.infer<typeof ListingFiltersSchema>

/** One uploaded image — mirrors lib/db/listings.ts ListingImageInput. */
export const ListingImageInputSchema = z.object({
  storage_key: z.string().min(1),
  position: z.number().int().nonnegative(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
})

/**
 * POST /api/v1/listings body — field names and bounds mirror
 * app/sell/actions.ts#createListing exactly (title 3–100, description 10–2000,
 * priceAed > 0, 1–8 images).
 */
export const CreateListingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be 3–100 characters.').max(100, 'Title must be 3–100 characters.'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be 10–2000 characters.')
    .max(2000, 'Description must be 10–2000 characters.'),
  priceAed: z.number().positive('Enter a valid price.'),
  category_id: z.string().min(1, 'Choose a category.'),
  condition: z.enum(CONDITION_VALUES as [string, ...string[]], { message: 'Choose a condition.' }),
  emirate: z.enum(EMIRATE_VALUES as [string, ...string[]], { message: 'Choose an emirate.' }),
  area: z.string().trim().max(120).optional(),
  isNegotiable: z.boolean().optional(),
  /** Category-specific facets (server whitelists + coerces against the schema). */
  attributes: z.record(z.string(), z.string()).optional(),
  images: z
    .array(ListingImageInputSchema)
    .min(1, 'Add at least one photo.')
    .max(UPLOAD_LIMITS.maxListingImages, 'Up to 8 photos.'),
})
export type CreateListingInput = z.infer<typeof CreateListingSchema>
