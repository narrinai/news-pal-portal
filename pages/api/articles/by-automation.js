import { getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, limit, offset } = req.query
  if (!automation_id) {
    return res.status(400).json({ error: 'automation_id is required' })
  }

  try {
    const allArticles = await getArticles()
    const filtered = allArticles
      .filter(a => a.automation_id === automation_id)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))

    const counts = {
      total: filtered.length,
      selected: filtered.filter(a => a.status === 'selected').length,
      published: filtered.filter(a => a.status === 'published').length,
      pending: filtered.filter(a => a.status === 'pending').length,
    }

    // Pagination: always return scheduled + pending first, then paginate published
    const scheduled = filtered.filter(a => a.status === 'selected')
    const pending = filtered.filter(a => a.status === 'pending')
    const published = filtered.filter(a => a.status === 'published')
    const other = filtered.filter(a => !['selected', 'pending', 'published'].includes(a.status))

    const pageLimit = parseInt(limit) || 20
    const pageOffset = parseInt(offset) || 0

    // Always include all scheduled + pending (they're the active pipeline)
    // Paginate published
    const paginatedPublished = published.slice(pageOffset, pageOffset + pageLimit)
    const articles = [...scheduled, ...pending, ...paginatedPublished, ...other]

    return res.status(200).json({
      articles,
      counts,
      pagination: {
        publishedTotal: published.length,
        publishedOffset: pageOffset,
        publishedLimit: pageLimit,
        hasMore: pageOffset + pageLimit < published.length,
      },
    })
  } catch (error) {
    console.error('Error fetching articles by automation:', error)
    return res.status(500).json({ error: 'Failed to fetch articles', details: error.message })
  }
}
