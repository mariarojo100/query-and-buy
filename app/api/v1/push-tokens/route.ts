/**
 * POST   /api/v1/push-tokens — register this device's Expo push token
 *                              (called on login and app foreground).
 * DELETE /api/v1/push-tokens — unregister on logout.
 */
import { RegisterPushTokenSchema, UnregisterPushTokenSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { registerPushTokenFor, unregisterPushToken } from '@/lib/db/pushTokens'
import { parseBody } from '@/lib/api/validate'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const parsed = await parseBody(req, RegisterPushTokenSchema)
    if (!parsed.ok) return parsed.response
    await registerPushTokenFor(viewer, parsed.data.token, parsed.data.platform)
    return ok({ registered: true })
  })
}

export async function DELETE(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const parsed = await parseBody(req, UnregisterPushTokenSchema)
    if (!parsed.ok) return parsed.response
    await unregisterPushToken(viewer, parsed.data.token)
    return ok({ unregistered: true })
  })
}
