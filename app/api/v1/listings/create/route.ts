/**
 * POST /api/v1/listings/create — publish a listing.
 * lib/listings/write.ts owns validation + the pre-write safety screen
 * (blocked content → 422 blocked_content, same as web).
 */
import { CreateListingSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { createListingAs } from '@/lib/listings/write'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'create-listing', 10)
    if (limited) return limited

    const parsed = await parseBody(req, CreateListingSchema)
    if (!parsed.ok) return parsed.response

    const res = await createListingAs(viewer, parsed.data)
    if (res.error) {
      if (res.needVerify || res.needPhoneVerify) {
        return fail('verification_required', res.error, 403, {
          needVerify: !!res.needVerify,
          needPhoneVerify: !!res.needPhoneVerify,
        })
      }
      return res.blocked
        ? fail('blocked_content', res.error, 422, { categories: res.categories })
        : fail('invalid_input', res.error, 422)
    }
    return ok({ id: res.id }, { status: 201 })
  })
}
