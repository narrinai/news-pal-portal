import { getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')

  try {
    const { category, limit, offset, automation_id } = req.query
    const maxArticles = Math.min(parseInt(limit || '20', 10), 50)
    const startOffset = Math.max(parseInt(offset || '0', 10), 0)

    // Only return published articles
    let articles = await getArticles('published', category || undefined)

    // Filter by automation_id if provided
    if (automation_id) {
      articles = articles.filter(a => a.automation_id === automation_id)
    }

    const total = articles.length

    // Return only the fields the consuming site needs
    const publicArticles = articles.slice(startOffset, startOffset + maxArticles).map(a => ({
      id: a.id,
      title: a.title,
      description: ((a.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim() + ((a.description || '').length > 200 ? '...' : '')),
      content: a.content_rewritten || a.description,
      html: a.content_html || '',
      // No `category` and no `source`: sites rendered the feed name as the article's
      // author ("RSS Feed") and the feed category as a tag ("COMPANION"). The original is
      // credited through sourceUrl instead. `?category=` still filters server-side.
      sourceUrl: a.url,
      imageUrl: a.imageUrl || '',
      subtitle: a.subtitle || '',
      faq: a.faq ? (typeof a.faq === 'string' ? JSON.parse(a.faq) : a.faq) : [],
      publishedAt: a.publishedAt,
      automation_id: a.automation_id || null,
      // 'news' | 'longread', plus the reading time for the deep dives. Older consuming
      // sites just ignore both fields.
      article_type: a.article_type || 'news',
      reading_time: a.reading_time || null,
    }))

    return res.status(200).json({
      success: true,
      total,
      count: publicArticles.length,
      offset: startOffset,
      articles: publicArticles,
    })
  } catch (error) {
    console.error('Error fetching public articles:', error)
    return res.status(500).json({ error: 'Failed to fetch articles' })
  }
}
