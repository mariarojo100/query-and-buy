import type { NextRequest } from 'next/server'

/**
 * Crawler, AI-referral and conversion log, read by Beacon (Pentagon X) to see
 * which AI crawlers fetch our pages, how many people click through from AI
 * answers, and what those people go on to do.
 *
 * Writes one line to stdout (→ the pm2 app log):
 *   [agent-hit]  for requests from a known search/AI crawler, or arriving from an
 *                AI assistant. Combined-log shaped; status is `000` because
 *                middleware runs before the page renders.
 *   [agent-conv] when a visitor who first arrived from an AI assistant signs up,
 *                lists, enquires, offers or confirms a deal.
 * Ordinary visitors are never logged, and no IP address, user id or email is
 * recorded. The only cookie is `qb_ai`, holding the assistant's name (30 days).
 */

const AGENT_UA =
  /googlebot|bingbot|bingpreview|claudebot|claude-searchbot|claude-user|anthropic-ai|gptbot|oai-searchbot|chatgpt-user|perplexity|applebot|duckduckbot|yandexbot|meta-external|amazonbot|bytespider|ccbot|cohere|mistralai/i

/** Assistant a person arrived from, by referrer or utm_source. Order matters: first match wins. */
const AI_SOURCES: [source: string, referrer: RegExp, utm: RegExp][] = [
  ['chatgpt', /chatgpt\.com|chat\.openai\.com/i, /^(chatgpt|chatgpt\.com|openai)$/i],
  ['perplexity', /perplexity\.ai/i, /^perplexity/i],
  ['claude', /claude\.ai/i, /^claude/i],
  ['gemini', /gemini\.google|bard\.google/i, /^gemini/i],
  ['copilot', /copilot\.microsoft|edgeservices\.bing|bing\.com\/chat/i, /^copilot/i],
  ['meta-ai', /meta\.ai/i, /^meta-?ai/i],
  ['you', /you\.com/i, /^you(\.com)?$/i],
]

export const AI_COOKIE = 'qb_ai'
export const AI_COOKIE_MAX_AGE = 30 * 24 * 60 * 60

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const clean = (s: string) => s.replace(/["\\\n\r]/g, "'").slice(0, 400)

function clf(d: Date) {
  return `${pad(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}:${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`
}

export function aiSourceOf(referer: string, utm: string): string | null {
  for (const [source, ref, u] of AI_SOURCES) if (ref.test(referer) || (utm && u.test(utm))) return source
  return null
}

/**
 * Logs the request if it's a crawler or an AI referral. Returns the assistant a
 * person arrived from (so middleware can remember it), or null.
 */
export function logAgentHit(req: NextRequest): string | null {
  try {
    const ua = req.headers.get('user-agent') ?? ''
    const referer = req.headers.get('referer') ?? ''
    const utm = req.nextUrl.searchParams.get('utm_source') ?? ''
    const bot = AGENT_UA.test(ua)
    const source = bot ? null : aiSourceOf(referer, utm)
    if (!bot && !source) return null

    const path = req.nextUrl.pathname + (utm ? `?utm_source=${encodeURIComponent(utm)}` : '')
    console.log(`[agent-hit] - - - [${clf(new Date())}] "${req.method} ${clean(path)} HTTP/1.1" 000 - "${clean(referer)}" "${clean(ua)}"`)
    return source
  } catch {
    // Logging must never break a request.
    return null
  }
}

export type ConversionEvent = 'signup' | 'listing' | 'inquiry' | 'offer' | 'deal'

/**
 * Record a conversion by a visitor who first came from an AI assistant. Server
 * actions only (reads the request cookie). Never throws.
 */
export async function logConversion(event: ConversionEvent): Promise<void> {
  try {
    const { cookies } = await import('next/headers')
    const source = (await cookies()).get(AI_COOKIE)?.value
    if (!source || !/^[a-z-]{2,20}$/.test(source)) return
    console.log(`[agent-conv] ${new Date().toISOString()} ${event} ${source}`)
  } catch {
    // Attribution must never break the action it rides on.
  }
}

/** Agent use of the machine layer (MCP tool calls, feed downloads), for Beacon. Never throws. */
export function logAgentUse(event: 'agent_search' | 'agent_view' | 'agent_categories' | 'agent_feed'): void {
  try {
    console.log(`[agent-conv] ${new Date().toISOString()} ${event} ${event === 'agent_feed' ? 'feed' : 'mcp'}`)
  } catch {
    // never break the response
  }
}
