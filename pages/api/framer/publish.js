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

    if (!automation.site_api_key || !automation.framer_collection) {
      return res.status(200).json({ success: false, error: 'Missing Framer API token or collection slug' })
    }

    // Get the collection ID
    const collectionsRes = await fetch('https://api.framer.com/v1/collections', {
      headers: { Authorization: `Bearer ${automation.site_api_key}` },
    })

    if (!collectionsRes.ok) {
      return res.status(200).json({ success: false, error: `Framer API error: ${collectionsRes.status}` })
    }

    const collections = await collectionsRes.json()
    const collection = collections.collections?.find(c => c.slug === automation.framer_collection)

    if (!collection) {
      return res.status(200).json({ success: false, error: `Collection "${automation.framer_collection}" not found` })
    }

    // Get articles to publish
    const allArticles = await getArticles()
    const idsFilter = article_ids && Array.isArray(article_ids) ? new Set(article_ids) : null
    const articlesToPublish = allArticles.filter(a => {
      if (idsFilter) return idsFilter.has(a.id)
      return a.automation_id === automation_id && a.status === 'published'
    })

    if (articlesToPublish.length === 0) {
      return res.status(200).json({ success: true, published: 0, message: 'No articles to publish' })
    }

    // Get existing items to check for duplicates (by slug)
    const existingRes = await fetch(`https://api.framer.com/v1/collections/${collection.id}/items?limit=100`, {
      headers: { Authorization: `Bearer ${automation.site_api_key}` },
    })
    const existingItems = existingRes.ok ? await existingRes.json() : { items: [] }
    const existingSlugs = new Map(
      (existingItems.items || []).map(item => [item.fieldData?.slug, item.id])
    )

    let published = 0

    for (const article of articlesToPublish) {
      const slug = (article.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
      if (!slug) continue

      const fieldData = {
        name: article.title,
        slug,
        _draft: false,
        _archived: false,
      }

      // Map common CMS fields — Framer collections vary, so we try common field names
      if (article.content_html || article.content_rewritten) fieldData['content'] = article.content_html || article.content_rewritten
      if (article.description) fieldData['description'] = article.description.replace(/<[^>]+>/g, '').substring(0, 200).trim()
      if (article.subtitle) fieldData['subtitle'] = article.subtitle
      if (article.imageUrl && !article.imageUrl.includes('placehold.co')) fieldData['image'] = article.imageUrl
      if (article.publishedAt) fieldData['date'] = article.publishedAt
      if (article.source) fieldData['source'] = article.source
      if (article.url) fieldData['source-url'] = article.url
      if (article.topic || article.category) fieldData['category'] = article.topic || article.category
      if (article.faq) fieldData['faq'] = article.faq

      try {
        const existingId = existingSlugs.get(slug)

        if (existingId) {
          // Update existing item
          const updateRes = await fetch(`https://api.framer.com/v1/collections/${collection.id}/items/${existingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${automation.site_api_key}`,
            },
            body: JSON.stringify({ fieldData }),
          })
          if (updateRes.ok) published++
          else console.warn(`[FRAMER] Failed to update ${slug}: ${updateRes.status}`)
        } else {
          // Create new item
          const createRes = await fetch(`https://api.framer.com/v1/collections/${collection.id}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${automation.site_api_key}`,
            },
            body: JSON.stringify({ fieldData }),
          })
          if (createRes.ok) published++
          else console.warn(`[FRAMER] Failed to create ${slug}: ${createRes.status}`)
        }
      } catch (err) {
        console.error(`[FRAMER] Error publishing ${slug}:`, err.message)
      }
    }

    return res.status(200).json({
      success: true,
      published,
      total: articlesToPublish.length,
    })
  } catch (error) {
    console.error('[FRAMER] Error:', error.message)
    return res.status(200).json({ success: false, error: error.message })
  }
}
