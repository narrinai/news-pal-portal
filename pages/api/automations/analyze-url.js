import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, extraContext } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    // Fetch the URL HTML
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsPal/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return res.status(400).json({ error: `Could not fetch URL: ${response.status}` })
    }

    const html = await response.text()

    // Extract title, meta description, and first ~3000 chars of text
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''

    // Strip HTML tags and get text content
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
1. "tags" — an array of 3-8 specific topic tags that describe what this site covers. Use lowercase English terms. Examples: "cybersecurity", "email marketing", "ai companion", "european tech", "seo", "content marketing", "privacy tools", "open source", "ransomware"
2. "audience" — an array of 1-4 target audience segments. Examples: "marketing managers", "developers", "entrepreneurs", "security professionals", "small business owners"
3. "suggestedName" — a short name for this automation based on the site (2-4 words)

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.

Example response:
{"tags":["email marketing","content marketing","seo"],"audience":["marketing managers","entrepreneurs"],"suggestedName":"Marketing Blog News"}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
