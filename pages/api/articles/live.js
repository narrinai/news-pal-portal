import { getLiveArticles, selectArticle, refreshRSSCache, getCacheStatus } from '../../../lib/article-manager'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { refresh } = req.query
      
      // Force refresh RSS cache if requested
      if (refresh === 'true') {
        refreshRSSCache()
      }
      
      const articles = await getLiveArticles()
      const cacheStatus = getCacheStatus()
      
      return res.status(200).json({
        articles,
        cache: cacheStatus,
        totalCounts: {
          pending: articles.pending.length,
          selected: articles.selected.length,
          rewritten: articles.rewritten.length,
          published: articles.published.length
        }
      })
    } catch (error) {
      console.error('Error fetching live articles:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch articles',
        details: error.message
      })
    }
  }

  if (req.method === 'POST') {
    // Select an article (save to Airtable)
    try {
      const { article } = req.body
      
      if (!article || !article.url) {
        return res.status(400).json({ error: 'Article data required' })
      }

      const selectedArticle = await selectArticle(article)
      
      return res.status(201).json({
        success: true,
        article: selectedArticle,
        message: 'Article selected and saved to Airtable'
      })
    } catch (error) {
      console.error('Error selecting article:', error)
      return res.status(500).json({ 
        error: 'Failed to select article',
        details: error.message
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}