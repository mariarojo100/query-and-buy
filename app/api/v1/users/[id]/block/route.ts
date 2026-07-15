/**
 * POST   /api/v1/users/:id/block — block a user (App Store UGC requirement):
 *        hides existing threads both ways and prevents new ones.
 * DELETE /api/v1/users/:id/block — unblock.
 */
import { getApiViewer } from '@/lib/api/auth'
import { blockUserFor, unblockUserFor } from '@/lib/db/blocks'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params
    const res = await blockUserFor(viewer, id)
    if (!res.ok) return fail('invalid_input', res.error ?? 'Could not block user.', 422)
    return ok({ blocked: true })
  })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params
    await unblockUserFor(viewer, id)
    return ok({ blocked: false })
  })
}
