/**
 * POST /api/v1/listings/:id/{sold|pause|resume|delete|view} — listing
 * lifecycle + view tracking. Owner-only except `view` (any signed-in viewer;
 * anonymous views go uncounted on mobile, matching web behavior for bumps).
 */
import { getApiViewer } from '@/lib/api/auth'
import {
  markListingSoldFor,
  softDeleteListingFor,
  setListingPausedFor,
  recordListingView,
  bumpViewCount,
} from '@/lib/db/listings'
import { ok, notFound, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
): Promise<Response> {
  return handle(async () => {
    const { id, action } = await ctx.params

    if (action === 'view') {
      const viewer = await getApiViewer(req)
      await bumpViewCount(id)
      if (viewer) await recordListingView(viewer, id)
      return ok({ recorded: true })
    }

    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    let done = false
    if (action === 'sold') done = await markListingSoldFor(viewer, id)
    else if (action === 'delete') done = await softDeleteListingFor(viewer, id)
    else if (action === 'pause') done = await setListingPausedFor(viewer, id, true)
    else if (action === 'resume') done = await setListingPausedFor(viewer, id, false)
    else return notFound('Action')

    if (!done) return notFound('Listing')
    return ok({ done: true })
  })
}
