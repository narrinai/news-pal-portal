/**
 * Editorial gate: does this story actually belong on this site?
 *
 * Feed + keyword matching is a coarse filter — a substring hit on one keyword is enough to
 * pull a story into an automation's candidate pool, which is how unrelated news ended up on
 * niche sites. This asks a cheap model the question a human editor would ask before
 * commissioning a rewrite, and the pipeline skips anything that doesn't clearly fit.
 *
 * The bar is deliberately high: publishing nothing today is a better outcome than
 * publishing something off-topic.
 */

import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// A small model is plenty for a fit judgement, and it runs on every candidate.
const MODEL = process.env.RELEVANCE_MODEL || 'gpt-4o-mini'

/** Default pass mark. Override per automation via ai_settings.min_relevance. */
export const DEFAULT_MIN_RELEVANCE = 60

export interface SiteProfile {
  name?: string
  url?: string
  /** Comma-separated niche keywords from the automation. */
  keywords?: string
  /** JSON array or comma-separated topic tags. */
  tags?: string
  audience?: string
  /** The operator's own brief for the site (extra_context). */
  extraContext?: string
}

export interface RelevanceVerdict {
  /** 0-100 fit with the site's beat, or -1 when the gate could not run. */
  score: number
  /** True when the article may be written and published for this site. */
  publish: boolean
  reason: string
  /** The gate did not actually judge (no API key, model error, no profile to judge against). */
  skipped: boolean
}

function tagList(tags?: string): string[] {
  if (!tags) return []
  try {
    const parsed = JSON.parse(tags)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

/** Everything we know about what the site is for, as one block for the prompt. */
function describeSite(site: SiteProfile): string {
  const lines: string[] = []
  if (site.name) lines.push(`Site: ${site.name}`)
  if (site.url) lines.push(`URL: ${site.url}`)
  const tags = tagList(site.tags)
  if (tags.length) lines.push(`Topics this site covers: ${tags.join(', ')}`)
  if (site.keywords) lines.push(`Niche keywords: ${site.keywords}`)
  if (site.audience) lines.push(`Audience: ${site.audience}`)
  if (site.extraContext) lines.push(`Editorial brief: ${site.extraContext.slice(0, 1200)}`)
  return lines.join('\n')
}

/** Enough profile to judge against? Without one, every article would look equally fine. */
export function hasProfile(site: SiteProfile): boolean {
  return Boolean(site.name || site.url || site.keywords || tagList(site.tags).length || site.extraContext)
}

const SYSTEM = `You are the editor-in-chief of a niche publication. For each story you decide one thing: does this belong on YOUR site?

You are strict. A story only fits when its SUBJECT is part of the site's beat — not when it merely shares a word, an industry, or a vague "tech" or "Europe" umbrella with it. Adjacent-but-different subjects do not fit. Big general news that any outlet would run does not fit unless it directly concerns the site's topic.

Scoring:
90-100 — squarely on the beat; readers come to this site for exactly this
70-89  — clearly relevant: a different angle on the beat, or a development that directly affects it
50-69  — adjacent: same broad industry, but not what this site is about
20-49  — barely connected; only a keyword links it
0-19   — unrelated

Publishing an off-topic article damages the site more than publishing nothing. When in doubt, score low.

Respond with JSON only: {"score": <0-100>, "reason": "<one sentence, max 25 words>"}`

export interface GateArticle {
  title: string
  description?: string
  content?: string
  source?: string
}

/**
 * Judge one article against one site. Never throws: on any failure it returns a skipped
 * verdict that lets the article through, because a model outage should not silently stop
 * a site from publishing (the rewrite that follows would fail on the same outage anyway).
 */
export async function assessRelevance(
  article: GateArticle,
  site: SiteProfile,
  opts: { minScore?: number } = {}
): Promise<RelevanceVerdict> {
  const minScore = opts.minScore ?? DEFAULT_MIN_RELEVANCE

  if (!hasProfile(site)) {
    return { score: -1, publish: true, reason: 'no site profile to judge against', skipped: true }
  }
  if (!openai) {
    return { score: -1, publish: true, reason: 'no OPENAI_API_KEY, relevance gate disabled', skipped: true }
  }

  const body = (article.content || article.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)

  const user = `${describeSite(site)}

---
CANDIDATE STORY
Headline: ${article.title}
${article.source ? `Outlet: ${article.source}` : ''}
Text: ${body || '(no body text available — judge on the headline)'}

---
Does this story belong on this site? Score its fit and give your reason.`

  try {
    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 200,
      },
      { timeout: 30000 }
    )

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const score = Math.max(0, Math.min(100, Number(parsed.score)))
    if (!Number.isFinite(score)) {
      return { score: -1, publish: true, reason: 'gate returned no score', skipped: true }
    }
    return {
      score,
      publish: score >= minScore,
      reason: String(parsed.reason || '').slice(0, 300),
      skipped: false,
    }
  } catch (e: any) {
    console.warn('[relevance] Gate failed, letting the article through:', e?.message)
    return { score: -1, publish: true, reason: `gate error: ${e?.message || 'unknown'}`, skipped: true }
  }
}
