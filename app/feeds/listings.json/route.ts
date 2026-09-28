/**
 * GET /feeds/listings.json — structured feed of active listings for AI agents
 * and shopping crawlers (a schema.org DataFeed of Products with Offers). Newest
 * 200 only; the MCP endpoint (/api/mcp) searches everything.
 */
import { listNewest, productNode } from '@/lib/agent/catalog'
import { logAgentUse } from '@/lib/agent-log'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  logAgentUse('agent_feed')
  const items = await listNewest(200)
  const body = {
    '@context': 'https://schema.org',
    '@type': 'DataFeed',
    name: `${SITE_NAME} active listings`,
    description: 'Second-hand items for sale in the UAE on Query & Buy, newest first. Prices in AED.',
    url: absoluteUrl('/feeds/listings.json'),
    dateModified: new Date().toISOString(),
    provider: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
    potentialAction: { '@type': 'SearchAction', target: absoluteUrl('/search?q={query}'), 'query-input': 'required name=query' },
    dataFeedElement: items.map(productNode),
  }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/ld+json; charset=utf-8', 'cache-control': 'public, max-age=900' },
  })
}
