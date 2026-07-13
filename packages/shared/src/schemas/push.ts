/**
 * Push-token schemas for /api/v1/push-tokens (Expo Push registration).
 * Backed by the PushToken Prisma model (added in the API-layer phase).
 */
import { z } from 'zod'

export const RegisterPushTokenSchema = z.object({
  /** Expo push token, e.g. ExponentPushToken[xxxxxxxx]. */
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android']),
})
export type RegisterPushTokenInput = z.infer<typeof RegisterPushTokenSchema>

export const UnregisterPushTokenSchema = z.object({
  token: z.string().min(10).max(200),
})
export type UnregisterPushTokenInput = z.infer<typeof UnregisterPushTokenSchema>

/** Notification deep-link payload carried in every push (data.url). */
export const PushDataSchema = z.object({
  url: z.string(),
  type: z.enum([
    'chat.message',
    'offer.received',
    'offer.accepted',
    'offer.declined',
    'order.confirmed',
    'order.sold',
  ]),
})
export type PushData = z.infer<typeof PushDataSchema>
