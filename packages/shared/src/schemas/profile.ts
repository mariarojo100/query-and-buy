/**
 * Profile schemas — bounds mirror app/account/actions.ts#updateProfile
 * (display name, username, bio, emirate) for /api/v1/me/*.
 */
import { z } from 'zod'
import { EMIRATE_VALUES } from '../constants'

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Name is too short.').max(60, 'Name is too long.').optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, 'Username: 3–30 chars, letters/numbers/underscore.')
    .optional(),
  bio: z.string().trim().max(500, 'Bio is too long.').optional(),
  emirate: z.enum(EMIRATE_VALUES as [string, ...string[]]).optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

/** POST /api/v1/uploads/* request — mirrors app/uploads/actions.ts PresignRequest. */
export const PresignRequestSchema = z.object({
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})
export type PresignRequestInput = z.infer<typeof PresignRequestSchema>

export const PresignedSlotSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  headers: z.record(z.string(), z.string()),
})
export type PresignedSlotDto = z.infer<typeof PresignedSlotSchema>
