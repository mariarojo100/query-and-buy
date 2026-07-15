/** GET /api/v1/listings/featured — home-screen featured strip. */
import { featuredListings } from '@/lib/db/listings'
import { ok, handle } from '@/lib/api/respond'

export async function GET(): Promise<Response> {
  return handle(async () => ok({ listings: await featuredListings(8) }))
}
