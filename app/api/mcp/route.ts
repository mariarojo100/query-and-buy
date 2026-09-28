/**
 * POST /api/mcp — a read-only Model Context Protocol server (Streamable HTTP,
 * stateless, JSON responses) so AI agents can search Query & Buy listings on a
 * buyer's behalf. Tools: search_listings, get_listing, list_categories.
 * Nothing here writes or needs an account; buying happens in-app (see the
 * `how_to_buy` field). Rate-limited per client IP.
 */
import { CONDITIONS, EMIRATES, SORTS, getListing, listCategories, searchListings, type SearchInput } from '@/lib/agent/catalog'
import { logAgentUse } from '@/lib/agent-log'
import { rateLimit } from '@/lib/security/rateLimit'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

export const dynamic = 'force-dynamic'

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
}

const TOOLS = [
  {
    name: 'search_listings',
    title: 'Search listings',
    description:
      'Search second-hand items for sale in the UAE on Query & Buy (cars, phones, electronics, furniture, property and more). ' +
      'Returns up to 20 active listings with price in AED, condition, location and a link. Use get_listing for full details.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the buyer wants, e.g. "iPhone 14 Pro" or "Nissan Patrol 2019"' },
        category: { type: 'string', description: 'Category slug from list_categories, e.g. "vehicles"' },
        emirate: { type: 'string', enum: EMIRATES },
        condition: { type: 'string', enum: CONDITIONS },
        min_price_aed: { type: 'number' },
        max_price_aed: { type: 'number' },
        sort: { type: 'string', enum: SORTS, default: 'newest' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_listing',
    title: 'Get a listing',
    description: 'Full details of one listing by its id (from search_listings): description, specs, photos, seller trust signals and how to buy it.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The listing id, 12 characters' } },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_categories',
    title: 'List categories',
    description: 'Top-level categories on Query & Buy with how many active listings each has.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

type RpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> }

const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } })
const rpcError = (id: RpcRequest['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
const toolResult = (data: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data })

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_listings':
      logAgentUse('agent_search')
      return toolResult(await searchListings(args as SearchInput))
    case 'get_listing': {
      logAgentUse('agent_view')
      const l = await getListing(String(args.id ?? ''))
      return l
        ? toolResult(l)
        : { content: [{ type: 'text', text: 'No active listing with that id. It may have sold; search again.' }], isError: true }
    }
    case 'list_categories':
      logAgentUse('agent_categories')
      return toolResult({ categories: await listCategories() })
    default:
      return null
  }
}

async function handle(msg: RpcRequest): Promise<object | null> {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(null, -32600, 'Invalid request')
  // Notifications (no id) get no response body.
  if (msg.id === undefined) return null
  switch (msg.method) {
    case 'initialize': {
      const asked = String(msg.params?.protocolVersion ?? '')
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'query-and-buy', title: SITE_NAME, version: '1.0.0', websiteUrl: absoluteUrl('/') },
          instructions:
            'Query & Buy is a UAE marketplace for second-hand items. Search with search_listings, open one with get_listing. ' +
            'Prices are in AED. To buy, send the person to the listing URL; chat and offers happen in-app.',
        },
      }
    }
    case 'ping':
      return { jsonrpc: '2.0', id: msg.id, result: {} }
    case 'tools/list':
      return { jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } }
    case 'tools/call': {
      const name = String(msg.params?.name ?? '')
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>
      try {
        const result = await callTool(name, args)
        return result ? { jsonrpc: '2.0', id: msg.id, result } : rpcError(msg.id, -32602, `Unknown tool: ${name}`)
      } catch {
        return { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Search is unavailable right now; try again shortly.' }], isError: true } }
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown'
  if (!rateLimit(`mcp:${ip}`, 60, 60_000).allowed) return json(rpcError(null, -32000, 'Too many requests; slow down.'), 429)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(rpcError(null, -32700, 'Parse error'), 400)
  }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.slice(0, 10).map((m) => handle(m as RpcRequest)))).filter(Boolean)
    return out.length ? json(out) : json(null, 202)
  }
  const out = await handle(body as RpcRequest)
  return out ? json(out) : json(null, 202)
}

export async function GET(): Promise<Response> {
  // No server-initiated stream: this server only answers requests.
  return new Response('Method Not Allowed. POST JSON-RPC to this endpoint (MCP Streamable HTTP).', {
    status: 405,
    headers: { allow: 'POST, OPTIONS', ...CORS },
  })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}
