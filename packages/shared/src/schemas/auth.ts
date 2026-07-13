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
