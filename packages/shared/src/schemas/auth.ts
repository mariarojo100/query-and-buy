/**
 * Auth schemas for the mobile token flow (/api/v1/auth/*).
 * Signup bounds mirror lib/auth/signup.ts; the token pair is issued by
 * lib/api/tokens.ts (access 1h / refresh 60d rotating).
 */
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  displayName: z.string().trim().min(2).max(60),
})
export type SignupInput = z.infer<typeof SignupSchema>

/** POST /api/v1/auth/google | /auth/apple — the provider id_token from the device. */
export const OAuthTokenSchema = z.object({
  idToken: z.string().min(20),
})
export type OAuthTokenInput = z.infer<typeof OAuthTokenSchema>

export const RefreshSchema = z.object({
  refreshToken: z.string().min(20),
})
export type RefreshInput = z.infer<typeof RefreshSchema>

/** POST /api/v1/me/phone/start — request an SMS OTP (Twilio Verify owns the code). */
export const PhoneStartSchema = z.object({
  phone: z.string().trim().min(1),
})
export type PhoneStartInput = z.infer<typeof PhoneStartSchema>

/** POST /api/v1/me/phone/verify — confirm the SMS OTP. */
export const PhoneVerifySchema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Enter the code from the SMS.'),
})
export type PhoneVerifyInput = z.infer<typeof PhoneVerifySchema>

/** GET /api/v1/me/phone — current phone-verification state. */
export const PhoneStateSchema = z.object({
  phoneE164: z.string().nullable(),
  verified: z.boolean(),
})
export type PhoneState = z.infer<typeof PhoneStateSchema>

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  displayName: z.string(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  accessExpiresAt: z.string(),
  refreshToken: z.string(),
  user: AuthUserSchema,
})
export type TokenPair = z.infer<typeof TokenPairSchema>
