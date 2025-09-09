import { fetchAllFeeds } from '../../../lib/rss-parser'
import { createArticle, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  // Verify this is a cron job request (can be called by external cron services)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[CRON] Starting daily RSS feed fetch...')
    
    // Fetch articles from RSS feeds
    const articles = await fetchAllFeeds()
    console.log(`[CRON] Fetched ${articles.length} articles from RSS feeds`)
    
    // Get existing articles to avoid duplicates
    console.log('[CRON] Getting existing articles from Airtable...')
    const existingArticles = await getArticles()
    console.log(`[CRON] Found ${existingArticles.length} existing articles`)
    
    const existingUrls = new Set(existingArticles.map(article => article.url))
    
    // Filter out articles that already exist
    const newArticles = articles.filter(article => !existingUrls.has(article.url))
    console.log(`[CRON] ${newArticles.length} new articles to add`)
    
    // Store new articles in Airtable
    const createdArticles = []
    for (const article of newArticles) {
      try {
        const created = await createArticle(article)
        createdArticles.push(created)
        console.log(`[CRON] Created article: ${article.title}`)
      } catch (error) {
        console.error('[CRON] Error creating article:', error)
      }
    }
    
    const result = {
      success: true,
      message: `Daily fetch completed: ${createdArticles.length} new articles added`,
      totalFetched: articles.length,
      newArticles: createdArticles.length,
      timestamp: new Date().toISOString()
    }
    
    console.log('[CRON] Daily fetch completed:', result)
    
    return res.status(200).json(result)
  } catch (error) {
    console.error('[CRON] Error in daily fetch endpoint:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch articles', 
      details: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}