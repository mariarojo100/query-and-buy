/**
 * lib/db/system/email — email_failures log (Phase 4).
 * Deny-all table under RLS (service-role only); a system repo here.
 */
import { db } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma/client'

export async function recordEmailFailure(input: {
  toEmail: string | null
  template: string | null
  error: string
  payload: unknown
}): Promise<void> {
  await db.emailFailure.create({
    data: {
      toEmail: input.toEmail,
      template: input.template,
      error: input.error,
      payload: input.payload == null ? Prisma.DbNull : (input.payload as Prisma.InputJsonValue),
    },
  })
}
