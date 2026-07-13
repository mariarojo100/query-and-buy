/** GET /api/v1/orders?role=buyer|seller — my purchases / my sales. */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { ordersForRole } from '@/lib/db/orders'
import { parseQuery } from '@/lib/api/validate'
import { ok, unauthorized, handle } from '@/lib/api/respond'

const QuerySchema = z.object({ role: z.enum(['buyer', 'seller']) })

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const parsed = parseQuery(req, QuerySchema)
    if (!parsed.ok) return parsed.response
    return ok({ orders: await ordersForRole(viewer, parsed.data.role) })
  })
}
