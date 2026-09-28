import type { NextRequest } from 'next/server'

/**
 * Crawler & AI-referral log, read by Beacon (Pentagon X) to see which AI
 * crawlers fetch our pages and how many people click through from AI answers.
 *
 * Writes one line to stdout (→ the pm2 app log) for requests from a known
 * search/AI crawler, or arriving from an AI assistant. Ordinary visitors are
 * never logged, and no IP address is recorded. The line is combined-log shaped
 * after the `[agent-hit]` marker; status is `000` because middleware runs before
 * the page renders.
 */

const AGENT_UA =
  /googlebot|bingbot|bingpreview|claudebot|claude-searchbot|claude-user|anthropic-ai|gptbot|oai-searchbot|chatgpt-user|perplexity|applebot|duckduckbot|yandexbot|meta-external|amazonbot|bytespider|ccbot|cohere|mistralai/i

const AI_REFERRER =
  /chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google|bard\.google|copilot\.microsoft|edgeservices\.bing|bing\.com\/chat|meta\.ai|you\.com/i

const AI_UTM = /^(chatgpt|chatgpt\.com|openai|perplexity|claude|gemini|copilot)/i

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const clean = (s: string) => s.replace(/["\\\n\r]/g, "'").slice(0, 400)

export function logAgentHit(req: NextRequest) {
  try {
    const ua = req.headers.get('user-agent') ?? ''
    const referer = req.headers.get('referer') ?? ''
    const utm = req.nextUrl.searchParams.get('utm_source') ?? ''
    if (!AGENT_UA.test(ua) && !AI_REFERRER.test(referer) && !AI_UTM.test(utm)) return

    const d = new Date()
    const time = `${pad(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}:${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`
    const path = req.nextUrl.pathname + (utm ? `?utm_source=${encodeURIComponent(utm)}` : '')
    console.log(`[agent-hit] - - - [${time}] "${req.method} ${clean(path)} HTTP/1.1" 000 - "${clean(referer)}" "${clean(ua)}"`)
  } catch {
    // Logging must never break a request.
  }
}
