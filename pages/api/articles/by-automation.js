import { getAutomationArticleList } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, limit, offset } = req.query
  if (!automation_id) {
    return res.status(400).json({ error: 'automation_id is required' })
  }

  try {
    const pageLimit = parseInt(limit) || 20
    const pageOffset = parseInt(offset) || 0

    // UI-only paginated read: counts via a light status scan, active articles in
    // full, published only for the requested page. The auto-pipeline is untouched.
    const { active, published, counts, publishedTotal } = await getAutomationArticleList(
      automation_id,
      pageLimit,
      pageOffset
    )

    // active is already sorted desc; split into the pipeline groups.
    const scheduled = active.filter(a => a.status === 'selected')
    const pending = active.filter(a => a.status === 'pending')
    const other = active.filter(a => !['selected', 'pending', 'published'].includes(a.status))

    // Always include all scheduled + pending (the active pipeline), then the
    // paginated published window.
    const articles = [...scheduled, ...pending, ...published, ...other]

    return res.status(200).json({
      articles,
      counts,
      pagination: {
        publishedTotal,
        publishedOffset: pageOffset,
        publishedLimit: pageLimit,
        hasMore: pageOffset + pageLimit < publishedTotal,
      },
    })
  } catch (error) {
    console.error('Error fetching articles by automation:', error)
    return res.status(500).json({ error: 'Failed to fetch articles', details: error.message })
  }
}
