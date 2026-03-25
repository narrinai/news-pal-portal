import { updateAutomation, getAutomation } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, automation_id } = req.body

  if (!url || !automation_id) {
    return res.status(400).json({ error: 'url and automation_id are required' })
  }

  try {
    // Verify automation exists
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    // Fetch the page HTML
    console.log(`[ANALYZE] Fetching page: ${url}`)
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsPal/1.0; +https://newspal.vercel.app)',
        'Accept': 'text/html',
      },
    })

    if (!pageRes.ok) {
      return res.status(400).json({ error: `Failed to fetch page: ${pageRes.status} ${pageRes.statusText}` })
    }

    const html = await pageRes.text()

    // Truncate HTML to stay within token limits (keep first ~30KB)
    const truncatedHtml = html.length > 30000 ? html.substring(0, 30000) + '\n<!-- truncated -->' : html

    // Send to OpenAI for analysis
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an HTML template extraction expert. Analyze article pages and extract reusable templates.
Return ONLY valid JSON with three keys: "card_template", "detail_template", and "brand_colors". No markdown, no code fences.`
          },
          {
            role: 'user',
            content: `Analyze this article page HTML. Extract two templates:

1. **Card template**: How this article would look as a card/summary in a listing (title, description, date, category, source).
   Use these placeholders: {{title}}, {{description}}, {{date}}, {{category}}, {{source}}, {{url}}, {{imageUrl}}
   Keep the EXACT CSS classes and HTML structure from the original page.

2. **Detail template**: How the full article page is structured (header, body, meta, sidebar).
   Use these placeholders: {{title}}, {{description}}, {{date}}, {{category}}, {{source}}, {{url}}, {{imageUrl}}, {{content}}
   Keep the EXACT CSS classes and HTML structure from the original page.

3. **Brand colors**: Extract the primary accent color, secondary color, and text color used on the page (from CSS, inline styles, or dominant visual elements). Return as hex codes.

Return ONLY a JSON object like:
{"card_template": "<article class=...>...</article>", "detail_template": "<div class=...>...</div>", "brand_colors": {"primary": "#e4006e", "secondary": "#1a1a1a", "text": "#374151"}}

Page HTML:
${truncatedHtml}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[ANALYZE] OpenAI error:', errText)
      return res.status(500).json({ error: 'AI analysis failed' })
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return res.status(500).json({ error: 'Empty AI response' })
    }

    // Parse the JSON response (strip code fences if present)
    let templates
    try {
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      templates = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('[ANALYZE] Failed to parse AI response:', content)
      return res.status(500).json({ error: 'Failed to parse AI template response', raw: content })
    }

    const cardTemplate = templates.card_template || ''
    const detailTemplate = templates.detail_template || ''
    const brandColors = templates.brand_colors || null

    // Save templates and brand colors to automation
    await updateAutomation(automation_id, {
      site_template: cardTemplate,
      site_detail_template: detailTemplate,
      site_example_url: url,
      ...(brandColors ? { site_brand_colors: JSON.stringify(brandColors) } : {}),
    })

    console.log(`[ANALYZE] Templates saved for automation ${automation_id}`, brandColors ? `Brand colors: ${JSON.stringify(brandColors)}` : '')

    return res.status(200).json({
      success: true,
      card_template: cardTemplate,
      detail_template: detailTemplate,
      brand_colors: brandColors,
      source_url: url,
    })
  } catch (error) {
    console.error('[ANALYZE] Error:', error)
    return res.status(500).json({ error: 'Template analysis failed', details: error.message })
  }
}
