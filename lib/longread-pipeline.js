const OpenAI = require('openai').default || require('openai')
const { getArticles, getAutomations, getAutomation, createArticle, updateArticle } = require('./airtable')
const { writeLongread } = require('./longread-writer')
const { scrapeArticleWithLinks } = require('./article-scraper')
const { findHeaderImage } = require('./image-search')
const { dedupeSources } = require('./source-links')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Topic selection is a cheap, well-bounded classification job — it does not need the
// model that writes the piece.
const CLUSTER_MODEL = process.env.LONGREAD_CLUSTER_MODEL || 'gpt-4o-mini'

// How far back to look for material, and how big a dossier to build.
const LOOKBACK_DAYS = 21
const MIN_CLUSTER_SIZE = 3
const MAX_DOSSIER_SIZE = 8
// Don't revisit a subject we already published a longread about in this window.
const TOPIC_COOLDOWN_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Decide whether a longread is due today for this automation. Weekly runs on Monday,
 * biweekly on alternating Mondays, monthly on the 1st — mirroring the cadence logic the
 * news pipeline already uses for publish_frequency.
 */
function isLongreadDue(automation, now = new Date()) {
  if (!automation.longread_enabled) return false

  const freq = automation.longread_frequency || 'weekly'
  const dayOfWeek = now.getDay()
  const dayOfMonth = now.getDate()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))

  switch (freq) {
    case 'weekly':   return dayOfWeek === 1
    case 'biweekly': return dayOfWeek === 1 && Math.floor(dayOfYear / 7) % 2 === 0
    case 'monthly':  return dayOfMonth === 1
    default:         return false
  }
}

/**
 * Stage 0: pick what the piece is about. Reads the automation's recent news pool and
 * asks for the single subject with enough substance behind it to carry a deep dive,
 * excluding subjects already covered.
 */
async function selectTopic(candidates, recentLongreadTitles, automation) {
  const list = candidates
    .map((a, i) => `[${i}] ${a.title}${a.source ? ` (${a.source}` : ''}${a.publishedAt ? `, ${String(a.publishedAt).split('T')[0]})` : a.source ? ')' : ''}\n    ${(a.description || '').replace(/<[^>]+>/g, '').slice(0, 200)}`)
    .join('\n')

  const excluded = recentLongreadTitles.length
    ? `\nALREADY COVERED — pick a different subject than any of these:\n${recentLongreadTitles.map(t => `- ${t}`).join('\n')}\n`
    : ''

  const niche = [automation.site_name, automation.keywords, automation.tags].filter(Boolean).join(' | ')

  const prompt = `You are the editor of a publication${niche ? ` about: ${niche}` : ''}. Below are the news items collected over the past ${LOOKBACK_DAYS} days.

Pick the ONE subject that deserves a 3000-word investigative deep dive this cycle.

A subject qualifies when several items circle the same development from different directions, so there is a story underneath the headlines. A single dramatic item with no supporting coverage does NOT qualify — the piece would have nothing to stand on.
${excluded}
NEWS ITEMS:
${list}

Return JSON:
{
  "topic": "the subject in one clear phrase, specific enough to research",
  "why": "one sentence on what makes this worth a deep dive rather than a news item",
  "article_indices": [the indices of every item that belongs to this subject, most central first]
}

Include at least ${MIN_CLUSTER_SIZE} indices. If no subject has that much behind it, return {"topic": null, "why": "...", "article_indices": []}.`

  const completion = await openai.chat.completions.create(
    {
      model: CLUSTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 800,
    },
    { timeout: 90000 }
  )

  const raw = completion.choices[0]?.message?.content || '{}'
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Topic selection returned invalid JSON')
  }

  if (!parsed.topic || !Array.isArray(parsed.article_indices) || parsed.article_indices.length < MIN_CLUSTER_SIZE) {
    return null
  }

  const members = parsed.article_indices
    .map(i => candidates[i])
    .filter(Boolean)
    .slice(0, MAX_DOSSIER_SIZE)

  if (members.length < MIN_CLUSTER_SIZE) return null

  return { topic: parsed.topic, why: parsed.why || '', members }
}

/**
 * Stage 1: turn the selected cluster into a dossier of real, fetched sources. Each
 * member is scraped for its full text AND its outbound links; both feed the writer's
 * citation allowlist, so the finished piece can only link to pages that exist.
 */
async function buildDossier(members) {
  const dossier = []
  const extraSources = []

  for (const a of members) {
    let content = a.originalContent || a.description || ''
    let links = []
    if (a.url) {
      try {
        const scraped = await scrapeArticleWithLinks(a.url)
        if (scraped.content.length > content.replace(/<[^>]+>/g, '').length) content = scraped.content
        links = scraped.links
      } catch (err) {
        console.warn(`[longread] Scrape failed for ${a.url}: ${err.message}`)
      }
    }

    let text = (content || '').replace(/<[^>]+>/g, '').trim()

    // Many outlets (BleepingComputer, DarkReading, …) refuse bot requests, so both the
    // RSS snippet and the scrape come back near-empty. When that happens we still hold
    // our own published article about that same story — the facts are in our archive.
    // Fall back to it rather than dropping the source and starving the dossier.
    if (text.length < 400) {
      const archived = (a.content_rewritten || '').replace(/<[^>]+>/g, '').trim()
      if (archived.length >= 400) {
        text = archived
        console.log(`[longread] Source unreachable, using our own coverage: ${String(a.title).slice(0, 60)}`)
      }
    }

    // A source with almost no text contributes nothing but noise to the dossier.
    if (text.length < 400) {
      console.log(`[longread] Skipping thin source: ${String(a.title).slice(0, 60)}`)
      continue
    }

    dossier.push({
      url: a.url,
      title: a.title,
      outlet: a.source || '',
      publishedAt: a.publishedAt,
      content: text,
    })
    extraSources.push(...links)
  }

  return { dossier, extraSources: dedupeSources(extraSources).slice(0, 20) }
}

/**
 * Generate one deep-dive longread for an automation and save it to Airtable, ready for
 * the existing auto-publish cron to publish and push. Returns null when there is not
 * enough material — that is a normal outcome, not an error.
 */
async function generateLongread(automationId, { force = false, language = null } = {}) {
  const automation = await getAutomation(automationId)
  if (!automation) throw new Error(`Automation ${automationId} not found`)

  if (!force && !isLongreadDue(automation)) {
    return { skipped: true, reason: 'not due today' }
  }

  const all = await getArticles(undefined, undefined, automationId)
  const cutoff = daysAgo(LOOKBACK_DAYS)

  const candidates = all
    .filter(a => a.article_type !== 'longread')
    .filter(a => a.title && a.url)
    .filter(a => {
      const d = a.publishedAt ? new Date(a.publishedAt) : a.createdAt ? new Date(a.createdAt) : null
      return d && d >= cutoff
    })
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 120)

  if (candidates.length < MIN_CLUSTER_SIZE) {
    return { skipped: true, reason: `only ${candidates.length} recent articles, need ${MIN_CLUSTER_SIZE}` }
  }

  const cooldown = daysAgo(TOPIC_COOLDOWN_DAYS)
  const recentLongreadTitles = all
    .filter(a => a.article_type === 'longread')
    .filter(a => {
      const d = a.publishedAt ? new Date(a.publishedAt) : null
      return !d || d >= cooldown
    })
    .map(a => a.title)
    .filter(Boolean)

  console.log(`[longread] [${automation.name}] Selecting topic from ${candidates.length} candidates`)
  const cluster = await selectTopic(candidates, recentLongreadTitles, automation)
  if (!cluster) {
    return { skipped: true, reason: 'no subject with enough supporting coverage' }
  }
  console.log(`[longread] [${automation.name}] Topic: "${cluster.topic}" (${cluster.members.length} sources) — ${cluster.why}`)

  const { dossier, extraSources } = await buildDossier(cluster.members)
  if (dossier.length < MIN_CLUSTER_SIZE) {
    return { skipped: true, reason: `only ${dossier.length} sources yielded usable text` }
  }

  // Same operator context the news rewrites get, so a longread matches the site's voice.
  const instructions = []
  if (automation.extra_context) instructions.push(automation.extra_context)
  const seoContext = []
  if (automation.site_name) seoContext.push(`Website: ${automation.site_name}`)
  if (automation.site_url) seoContext.push(`URL: ${automation.site_url}`)
  if (automation.keywords) seoContext.push(`Site niche keywords: ${automation.keywords}`)
  if (automation.tags) seoContext.push(`Content tags/topics: ${automation.tags}`)
  if (seoContext.length) {
    instructions.push(`SEO CONTEXT — choose keywords relevant to this site and audience:\n${seoContext.join('\n')}`)
  }
  let brandColors = null
  try { if (automation.site_brand_colors) brandColors = JSON.parse(automation.site_brand_colors) } catch {}
  if (brandColors?.primary) {
    instructions.push(`BRAND COLORS: use ${brandColors.primary} as the accent for pull quotes, stat blocks and tables instead of the default indigo (#4f46e5).`)
  }

  let targetAudience
  try {
    const parsedAudience = automation.target_audience ? JSON.parse(automation.target_audience) : null
    targetAudience = Array.isArray(parsedAudience) ? parsedAudience.join(', ') : automation.target_audience || undefined
  } catch {
    targetAudience = automation.target_audience || undefined
  }

  const written = await writeLongread(cluster.topic, dossier, {
    // A site can want its deep dives in a different language than its news feed
    // (e.g. a Dutch-language site whose automation pulls English sources).
    language: language || automation.language || 'nl',
    targetAudience,
    extraInstructions: instructions.join('\n\n') || undefined,
    extraSources,
  })

  let imageUrl = null
  try {
    imageUrl = await findHeaderImage(written.title, [cluster.topic])
  } catch {}

  // Published on generation day; the hourly auto-publish cron picks it up from here and
  // pushes it to the connected site exactly like a news article.
  const publishedAt = new Date().toISOString()

  let created
  try {
    created = await createArticle({
      title: written.title,
      description: written.meta_description || written.subtitle || '',
      url: dossier[0].url,
      source: 'News Pal Longread',
      publishedAt,
      status: 'selected',
      category: automation.categories?.split(',')[0]?.trim() || 'longread',
      originalContent: '',
      content_rewritten: written.content,
      content_html: written.content_html,
      imageUrl: imageUrl || '',
      automation_id: automationId,
      article_type: 'longread',
      reading_time: written.reading_time,
      longread_sources: JSON.stringify(written.sources.map(s => ({ url: s.url, title: s.title }))),
    })
  } catch (err) {
    throw new Error(`Longread written but could not be saved: ${err.message}`)
  }

  // Fields createArticle doesn't write on insert.
  try {
    await updateArticle(created.id, {
      subtitle: written.subtitle || '',
      faq: written.faq?.length ? JSON.stringify(written.faq) : '',
      ...(written.focus_keyword ? { focus_keyword: written.focus_keyword } : {}),
      ...(written.meta_description ? { meta_description: written.meta_description } : {}),
      ...(written.seo_keywords?.length ? { seo_keywords: written.seo_keywords.join(', ') } : {}),
      ...(written.category ? { topic: written.category.replace(/^["']+|["']+$/g, '').trim() } : {}),
    })
  } catch (err) {
    console.error(`[longread] Saved article ${created.id} but metadata update failed: ${err.message}`)
  }

  console.log(`[longread] [${automation.name}] ✅ "${written.title}" (${written.reading_time} min, ${dossier.length} sources)`)

  return {
    skipped: false,
    id: created.id,
    title: written.title,
    topic: cluster.topic,
    thesis: written.angle.thesis,
    reading_time: written.reading_time,
    sources: written.sources.length,
  }
}

/**
 * Cron entry point: run every automation whose longread cadence falls due today.
 * One automation failing never stops the others.
 */
async function runLongreadPipeline({ force = false, singleAutomationId = null } = {}) {
  const automations = await getAutomations()
  let targets = automations.filter(a => a.enabled && a.longread_enabled)
  if (singleAutomationId) targets = automations.filter(a => a.id === singleAutomationId)

  if (!targets.length) {
    return { success: true, message: 'No automations with longreads enabled', results: [] }
  }

  const results = []
  for (const automation of targets) {
    try {
      const result = await generateLongread(automation.id, { force })
      results.push({ automation_id: automation.id, automation_name: automation.name, ...result })
    } catch (err) {
      console.error(`[longread] [${automation.name}] Failed:`, err.message)
      results.push({ automation_id: automation.id, automation_name: automation.name, error: err.message })
    }
  }

  const written = results.filter(r => r.skipped === false).length
  return {
    success: true,
    message: `Longread pipeline: ${written} written, ${results.length - written} skipped/failed`,
    results,
  }
}

// selectTopic/buildDossier are exported so the generation chain can be exercised
// end-to-end without writing to Airtable.
module.exports = { runLongreadPipeline, generateLongread, isLongreadDue, selectTopic, buildDossier }
