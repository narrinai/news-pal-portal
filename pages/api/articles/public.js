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
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

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
      description: a.description,
      content: a.content_rewritten || a.description,
      html: a.content_html || '',
      category: a.category,
      source: a.source,
      sourceUrl: a.url,
      imageUrl: a.imageUrl || '',
      publishedAt: a.publishedAt,
      automation_id: a.automation_id || null,
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
