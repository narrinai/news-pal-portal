import { getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Allow CORS so external sites can fetch articles
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { category, limit, automation_id } = req.query
    const maxArticles = Math.min(parseInt(limit || '20', 10), 50)

    // Only return published articles
    let articles = await getArticles('published', category || undefined)

    // Filter by automation_id if provided
    if (automation_id) {
      articles = articles.filter(a => a.automation_id === automation_id)
    }

    // Return only the fields the consuming site needs
    const publicArticles = articles.slice(0, maxArticles).map(a => ({
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
      count: publicArticles.length,
      articles: publicArticles,
    })
  } catch (error) {
    console.error('Error fetching public articles:', error)
    return res.status(500).json({ error: 'Failed to fetch articles' })
  }
}
