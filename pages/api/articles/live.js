import { getLiveArticles, selectArticle, refreshRSSCache, getCacheStatus } from '../../../lib/article-manager'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { refresh } = req.query
      
      console.log('Live articles API called with refresh:', refresh)
      
      // Always get Airtable data first (fast and reliable)
      const { getArticles } = require('../../../lib/airtable')
      const airtableArticles = await getArticles()
      console.log(`Airtable articles loaded: ${airtableArticles.length}`)
      
      // Separate by status
      const selected = airtableArticles.filter(a => a.status === 'selected')
      const rewritten = airtableArticles.filter(a => a.status === 'rewritten')  
      const published = airtableArticles.filter(a => a.status === 'published')
      
      // Try to get RSS data (but don't fail if it times out)
      let pending = []
      try {
        if (refresh === 'true') {
          console.log('Force refreshing RSS cache...')
          refreshRSSCache()
        }
        
        const liveData = await getLiveArticles()
        pending = liveData.pending || []
        console.log(`RSS articles loaded: ${pending.length}`)
      } catch (rssError) {
        console.error('RSS fetch failed, continuing with Airtable only:', rssError)
        // Continue without RSS data - show Airtable articles only
      }
      
      const cacheStatus = getCacheStatus()
      
      const articles = {
        pending: pending.slice(0, 50), // Increased limit for more articles
        selected,
        rewritten,
        published
      }
      
      return res.status(200).json({
        articles,
        cache: cacheStatus,
        totalCounts: {
          pending: articles.pending.length,
          selected: articles.selected.length,
          rewritten: articles.rewritten.length,
          published: articles.published.length
        },
        rssStatus: pending.length > 0 ? 'success' : 'failed'
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