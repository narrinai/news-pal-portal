import { getAutomation, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, article_ids } = req.body
  console.log(`[push-articles] Called — automation_id: ${automation_id}, article_ids: ${JSON.stringify(article_ids)}`)

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  try {
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    if (!automation.site_url || !automation.site_api_key) {
      return res.status(200).json({ success: false, error: 'No site URL or API key configured' })
    }
    // WordPress and HubSpot use their own publish APIs — not this push mechanism
    if (automation.site_platform === 'wordpress' || automation.site_platform === 'hubspot') {
      return res.status(200).json({ success: false, error: 'Use the WordPress/HubSpot publish flow instead' })
    }

    // Get published articles — optionally filtered to specific IDs
    const allArticles = await getArticles()
    const idsFilter = article_ids && Array.isArray(article_ids) ? new Set(article_ids) : null
    // Derive site category from the site_url path segment
    // e.g. https://repricing.de/news/retail → "Retail"
    // This ensures pushed articles appear under the correct section on the site
    const siteUrlPath = (() => { try { return new URL(automation.site_url).pathname } catch { return '' } })()
    const lastSegment = siteUrlPath.split('/').filter(Boolean).pop()
    const primaryCategory = lastSegment
      ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
      : (automation.categories ? automation.categories.split(',')[0].trim() : undefined)
    const publishedArticles = allArticles
      .filter(a => {
        if (idsFilter) {
          // Specific article push: match by ID only — automation_id may be unset on older articles
          return idsFilter.has(a.id)
        }
        // Full sync: require both automation_id match and published status
        return a.automation_id === automation_id && a.status === 'published'
      })
      .map(a => ({
        id: a.id,
        slug: (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
        title: a.title,
        description: (a.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim() + ((a.description || '').length > 200 ? '...' : ''),
        content_html: a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`,
        category: primaryCategory || a.topic || a.category,
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
    console.log(`[push-articles] Pushing ${publishedArticles.length} article(s) to ${pushUrl} with key ${automation.site_api_key?.slice(0, 10)}...`)

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
      console.log(`[push-articles] Response: ${pushRes.status}`, JSON.stringify(data).slice(0, 200))

      if (!pushRes.ok) {
        console.error(`[push-articles] Batch ${i / BATCH_SIZE + 1} failed: ${pushRes.status}`)
        return res.status(200).json({
          success: false,
          error: `Site returned ${pushRes.status} on batch ${Math.floor(i / BATCH_SIZE) + 1}`,
          pushed: totalReceived,
        })
      }

      totalReceived += data.received ?? batch.length
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
