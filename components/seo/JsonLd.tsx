/**
 * Renders a JSON-LD structured-data block. Server component; the payload is
 * serialized once at render. Use the builders in lib/seo.ts to produce `data`.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here (no user-controlled </script> can survive JSON encoding of the fields we build).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
