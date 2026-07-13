/**
 * lib/api/validate — zod validation at the /api/v1 boundary.
 * ===========================================================================
 * Schemas come from @qb/shared (the same ones the mobile forms use, so the
 * user has already seen these messages client-side; the server re-checks).
 * Returns a discriminated result — handlers early-return `result.response`.
 */
import type { NextResponse } from 'next/server'
import type { z } from 'zod'
import { fail } from '@/lib/api/respond'

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Parse a JSON body against a schema; 422 envelope on malformed JSON or schema failure. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<Parsed<z.infer<S>>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, response: fail('invalid_input', 'Request body must be JSON.', 422) }
  }
  return parseValue(raw, schema)
}

/** Parse URL search params (flat object of strings) against a schema. */
export function parseQuery<S extends z.ZodTypeAny>(req: Request, schema: S): Parsed<z.infer<S>> {
  const url = new URL(req.url)
  const raw: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    if (v !== '') raw[k] = v
  })
  return parseValue(raw, schema)
}

function parseValue<S extends z.ZodTypeAny>(raw: unknown, schema: S): Parsed<z.infer<S>> {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const first = result.error.issues[0]
    const where = first?.path?.length ? ` (${first.path.join('.')})` : ''
    return {
      ok: false,
      response: fail('invalid_input', `${first?.message ?? 'Invalid input.'}${where}`, 422),
    }
  }
  return { ok: true, data: result.data }
}
