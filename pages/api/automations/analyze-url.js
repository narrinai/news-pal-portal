import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// A realistic browser User-Agent — some sites 403 obvious bot UAs.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// Prepend https:// when the user omits the scheme (bare "example.com" makes fetch throw).
function normalizeUrl(raw) {
  const t = String(raw).trim()
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function extractFromHtml(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  const textContent = bodyHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 3000)

  return { title, metaDescription, textContent }
}

// Direct fetch first; on any block/failure fall back to Jina AI Reader, which renders
// the page from its own infra and bypasses Cloudflare/IP bot blocks (the reason
// datacenter-hosted fetches get a 403 while the site loads fine in a browser).
async function fetchPageContent(url) {
  // 1) direct fetch with a browser UA
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }).finally(() => clearTimeout(timeout))
    if (response.ok) {
      return { ...extractFromHtml(await response.text()), via: 'direct' }
    }
    console.warn(`[analyze-url] direct fetch ${url} -> ${response.status}, trying reader`)
  } catch (e) {
    console.warn(`[analyze-url] direct fetch ${url} failed (${e.message}), trying reader`)
  }

  // 2) fallback: Jina AI Reader returns cleaned text (with a "Title:" header)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  const r = await fetch(`https://r.jina.ai/${url}`, {
    signal: controller.signal,
    headers: { 'Accept': 'text/plain', 'User-Agent': BROWSER_UA },
  }).finally(() => clearTimeout(timeout))
  if (!r.ok) {
    const err = new Error(`reader returned ${r.status}`)
    err.blocked = true
    throw err
  }
  const text = await r.text()
  const titleMatch = text.match(/^Title:\s*(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : ''
  const textContent = text.replace(/\s+/g, ' ').trim().substring(0, 3000)
  return { title, metaDescription: '', textContent, via: 'reader' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url: rawUrl, extraContext } = req.body

  if (!rawUrl || !String(rawUrl).trim()) {
    return res.status(400).json({ error: 'URL is required' })
  }

  const url = normalizeUrl(rawUrl)

  try {
    let title, metaDescription, textContent
    try {
      ({ title, metaDescription, textContent } = await fetchPageContent(url))
    } catch (fetchErr) {
      return res.status(400).json({
        error: `Kon de site niet ophalen (${url}). De site blokkeert mogelijk geautomatiseerde toegang — vul de tags handmatig in of geef extra context.`,
      })
    }

    if (!textContent) {
      return res.status(400).json({
        error: `Geen leesbare inhoud gevonden op ${url}. Vul de tags handmatig in of geef extra context.`,
      })
    }

    if (!anthropic) {
      return res.status(500).json({ error: 'AI service not configured (missing ANTHROPIC_API_KEY)' })
    }

    // Send to Claude for analysis
    const prompt = `Analyze this website and suggest relevant tags (topics/niches) and target audience segments.

WEBSITE TITLE: ${title}
META DESCRIPTION: ${metaDescription}
CONTENT PREVIEW: ${textContent}
${extraContext ? `\nEXTRA CONTEXT FROM USER:\n${extraContext}` : ''}

Based on this website, return a JSON object with:
1. "tags" — an array of 3-8 specific topic tags that describe what this site covers. Use lowercase English terms. Examples: "cybersecurity", "email marketing", "ai companion", "european tech", "seo", "content marketing", "privacy tools", "open source", "ransomware". If the site is in German or targets a German audience, also include relevant German-specific tags such as "german tech", "german news", "german business", or "ki".
2. "audience" — an array of 1-4 target audience segments. Examples: "marketing managers", "developers", "entrepreneurs", "security professionals", "small business owners"
3. "suggestedName" — a short name for this automation based on the site (2-4 words)

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.

Example response:
{"tags":["email marketing","content marketing","seo"],"audience":["marketing managers","entrepreneurs"],"suggestedName":"Marketing Blog News"}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' })
    }

    const result = JSON.parse(jsonMatch[0])

    return res.status(200).json({
      success: true,
      tags: result.tags || [],
      audience: result.audience || [],
      suggestedName: result.suggestedName || '',
      siteTitle: title,
      siteDescription: metaDescription,
    })
  } catch (error) {
    console.error('[analyze-url] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to analyze URL' })
  }
}
