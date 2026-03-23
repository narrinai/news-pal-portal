import { getAutomation, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, article_ids } = req.body

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  try {
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    if (!automation.site_url || !automation.site_api_key || automation.site_platform !== 'replit') {
      return res.status(200).json({ success: false, error: 'No Replit site configured' })
    }

    // Get published articles — optionally filtered to specific IDs
    const allArticles = await getArticles()
    const idsFilter = article_ids && Array.isArray(article_ids) ? new Set(article_ids) : null
    const publishedArticles = allArticles
      .filter(a => a.automation_id === automation_id && a.status === 'published')
      .filter(a => idsFilter ? idsFilter.has(a.id) : true)
      .map(a => ({
        id: a.id,
        slug: (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
        title: a.title,
        description: (a.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim() + ((a.description || '').length > 200 ? '...' : ''),
        content_html: a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`,
        category: a.category,
        source: a.source,
        sourceUrl: a.url,
        imageUrl: a.imageUrl || `https://placehold.co/1200x630/4f46e5/ffffff?text=${encodeURIComponent((a.title || 'Article').substring(0, 30))}`,
        subtitle: a.subtitle || '',
        publishedAt: a.publishedAt,
        faq: a.faq || null,
      }))

    if (publishedArticles.length === 0) {
      return res.status(200).json({ success: true, pushed: 0, message: 'No published articles to push' })
    }

    const targetUrl = automation.replit_url || automation.site_url
    const origin = new URL(targetUrl).origin
    const pushUrl = `${origin}/newspal/receive`

    // Push in batches of 3 to avoid 413 Payload Too Large
    const BATCH_SIZE = 3
    let totalReceived = 0
    let totalOnSite = 0

    for (let i = 0; i < publishedArticles.length; i += BATCH_SIZE) {
      const batch = publishedArticles.slice(i, i + BATCH_SIZE)
      const pushRes = await fetch(pushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-newspal-key': automation.site_api_key,
        },
        body: JSON.stringify({ articles: batch }),
      })

      const data = await pushRes.json().catch(() => ({}))

      if (!pushRes.ok) {
        console.error(`[push-articles] Batch ${i / BATCH_SIZE + 1} failed: ${pushRes.status}`)
        return res.status(200).json({
          success: false,
          error: `Site returned ${pushRes.status} on batch ${Math.floor(i / BATCH_SIZE) + 1}`,
          pushed: totalReceived,
        })
      }

      totalReceived += data.received || batch.length
      totalOnSite = data.total || totalOnSite
    }

    return res.status(200).json({
      success: true,
      pushed: totalReceived,
      total: totalOnSite,
    })
  } catch (error) {
    console.error('[push-articles] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: error.message,
    })
  }
}
