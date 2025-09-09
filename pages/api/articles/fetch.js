import { fetchAllFeeds } from '../../../lib/rss-parser'
import { createArticle, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting RSS feed fetch...')
    
    // Fetch articles from RSS feeds
    const articles = await fetchAllFeeds()
    console.log(`Fetched ${articles.length} articles from RSS feeds`)
    
    // Get existing articles to avoid duplicates
    console.log('Getting existing articles from Airtable...')
    const existingArticles = await getArticles()
    console.log(`Found ${existingArticles.length} existing articles`)
    
    const existingUrls = new Set(existingArticles.map(article => article.url))
    
    // Filter out articles that already exist
    const newArticles = articles.filter(article => !existingUrls.has(article.url))
    console.log(`${newArticles.length} new articles to add`)
    
    // Store new articles in Airtable
    const createdArticles = []
    for (const article of newArticles.slice(0, 20)) { // Limit to 20 new articles at a time
      try {
        const created = await createArticle(article)
        createdArticles.push(created)
        console.log(`Created article: ${article.title}`)
      } catch (error) {
        console.error('Error creating article:', error)
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `${createdArticles.length} new articles added`,
      totalFetched: articles.length,
      newArticles: createdArticles.length
    })
  } catch (error) {
    console.error('Error in fetch endpoint:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch articles', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}