// Test Nederlandse RSS feeds specifically
export default async function handler(req, res) {
  try {
    const Parser = require('rss-parser')
    const parser = new Parser()
    
    console.log('Testing Dutch RSS feeds...')
    
    // Test Dutch security feeds
    const nlFeeds = [
      { name: 'Security.NL', url: 'https://www.security.nl/rss.xml' },
      { name: 'Computable', url: 'https://www.computable.nl/rss.xml' },
      { name: 'Tweakers', url: 'https://feeds.feedburner.com/tweakers/mixed' }
    ]
    
    const results = []
    
    for (const feedConfig of nlFeeds) {
      try {
        console.log(`Testing: ${feedConfig.name}`)
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
        
        const fetchPromise = parser.parseURL(feedConfig.url)
        const feed = await Promise.race([fetchPromise, timeoutPromise])
        
        // Get sample articles
        const articles = []
        for (const item of (feed.items || []).slice(0, 3)) {
          articles.push({
            title: item.title || 'No title',
            description: (item.description || '').substring(0, 100) + '...',
            hasContent: !!(item.title || item.description)
          })
        }
        
        results.push({
          name: feedConfig.name,
          url: feedConfig.url,
          status: 'success',
          totalItems: feed.items?.length || 0,
          sampleArticles: articles
        })
        
      } catch (error) {
        console.error(`Failed to fetch ${feedConfig.name}:`, error)
        results.push({
          name: feedConfig.name,
          url: feedConfig.url,
          status: 'failed',
          error: error.message
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Dutch RSS feed test completed',
      results,
      summary: {
        total: nlFeeds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    })
    
  } catch (error) {
    console.error('Dutch RSS test failed:', error)
    return res.status(500).json({
      error: 'Dutch RSS test failed',
      details: error.message
    })
  }
}