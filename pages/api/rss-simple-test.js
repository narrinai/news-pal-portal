// Simple RSS test with minimal feeds
export default async function handler(req, res) {
  try {
    const Parser = require('rss-parser')
    const parser = new Parser()
    
    console.log('Testing single RSS feed...')
    
    // Test with just one reliable feed
    const testFeed = 'https://feeds.feedburner.com/TheHackersNews'
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000) // Very short timeout
    )
    
    const fetchPromise = parser.parseURL(testFeed)
    const feed = await Promise.race([fetchPromise, timeoutPromise])
    
    console.log(`Feed loaded: ${feed.items?.length || 0} items`)
    
    // Simple keyword check
    const articles = []
    for (const item of (feed.items || []).slice(0, 5)) {
      const content = `${item.title} ${item.description}`.toLowerCase()
      
      if (content.includes('security') || content.includes('hack') || content.includes('cyber')) {
        articles.push({
          title: item.title,
          description: item.description || '',
          url: item.link || '',
          source: 'The Hacker News',
          publishedAt: item.pubDate || new Date().toISOString(),
          category: 'cybersecurity-international'
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      feedUrl: testFeed,
      totalItems: feed.items?.length || 0,
      filteredArticles: articles.length,
      articles: articles.slice(0, 3) // Just first 3 for testing
    })
    
  } catch (error) {
    console.error('RSS simple test failed:', error)
    return res.status(500).json({
      error: 'RSS test failed',
      details: error.message
    })
  }
}