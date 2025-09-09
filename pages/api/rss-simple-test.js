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
    
    // Debug keyword check
    const articles = []
    const debugInfo = []
    
    for (const item of (feed.items || []).slice(0, 10)) {
      const title = item.title || ''
      const description = item.description || ''
      const content = `${title} ${description}`.toLowerCase()
      
      // Check for any security-related keywords
      const hasSecurityKeywords = content.includes('security') || content.includes('hack') || 
                                 content.includes('cyber') || content.includes('breach') || 
                                 content.includes('malware') || content.includes('vulnerability') ||
                                 content.includes('attack') || content.includes('threat')
      
      debugInfo.push({
        title: title.substring(0, 50) + '...',
        hasKeywords: hasSecurityKeywords,
        contentSample: content.substring(0, 100) + '...'
      })
      
      if (hasSecurityKeywords) {
        articles.push({
          title: title,
          description: description,
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
      articles: articles.slice(0, 5),
      debugInfo: debugInfo
    })
    
  } catch (error) {
    console.error('RSS simple test failed:', error)
    return res.status(500).json({
      error: 'RSS test failed',
      details: error.message
    })
  }
}