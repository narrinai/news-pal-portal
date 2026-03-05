import { getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id } = req.query
  if (!automation_id) {
    return res.status(400).json({ error: 'automation_id is required' })
  }

  try {
    const allArticles = await getArticles()
    const articles = allArticles
      .filter(a => a.automation_id === automation_id)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))

    const counts = {
      total: articles.length,
      selected: articles.filter(a => a.status === 'selected').length,
      published: articles.filter(a => a.status === 'published').length,
    }

    return res.status(200).json({ articles, counts })
  } catch (error) {
    console.error('Error fetching articles by automation:', error)
    return res.status(500).json({ error: 'Failed to fetch articles', details: error.message })
  }
}
