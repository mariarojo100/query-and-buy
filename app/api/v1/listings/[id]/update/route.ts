/** POST /api/v1/listings/:id/update — edit a listing (owner-only, re-screened). */
import { CreateListingSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { updateListingAs } from '@/lib/listings/write'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, CreateListingSchema)
    if (!parsed.ok) return parsed.response

    const { id } = await ctx.params
    const res = await updateListingAs(viewer, { ...parsed.data, id })
    if (res.error) {
      return res.blocked
        ? fail('blocked_content', res.error, 422, { categories: res.categories })
        : fail('invalid_input', res.error, 422)
    }
    return ok({ id })
  })
}
