// Direct test of RSS feed processing
export default async function handler(req, res) {
  try {
    console.log('Testing RSS feed processing directly...')
    
    // Test your configured feeds
    const testFeeds = [
      {
        id: 'hackernews-test',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity-international',
        enabled: true,
        maxArticles: 5
      },
      {
        id: 'tweakers-test',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 5
      }
    ]

    const results = []
    
    for (const feed of testFeeds) {
      try {
        console.log(`Testing feed: ${feed.name}`)
        
        const Parser = require('rss-parser')
        const parser = new Parser()
        
        // Fetch RSS feed
        const rssData = await parser.parseURL(feed.url)
        console.log(`${feed.name}: ${rssData.items?.length || 0} total items`)
        
        // Test first 3 articles for keywords
        const articles = []
        const keywords = feed.category === 'cybersecurity-nl' 
          ? ['beveiliging', 'cyberbeveiliging', 'hack', 'security', 'tech', 'software', 'data'] 
          : ['security', 'cyber', 'hack', 'malware', 'breach', 'threat']
        
        for (const item of (rssData.items || []).slice(0, 3)) {
          const title = item.title || ''
          const description = item.description || item.contentSnippet || ''
          const content = `${title} ${description}`.toLowerCase()
          
          const matchedKeywords = keywords.filter(k => content.includes(k))
          const isRelevant = matchedKeywords.length > 0
          
          articles.push({
            title: title.substring(0, 60) + '...',
            hasKeywords: isRelevant,
            matchedKeywords: matchedKeywords,
            category: feed.category
          })
        }
        
        results.push({
          feed: feed.name,
          url: feed.url,
          status: 'success',
          totalItems: rssData.items?.length || 0,
          testArticles: articles,
          relevantArticles: articles.filter(a => a.hasKeywords).length
        })
        
      } catch (error) {
        console.error(`Failed to test ${feed.name}:`, error)
        results.push({
          feed: feed.name,
          url: feed.url,
          status: 'failed',
          error: error.message
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'RSS feed test completed',
      results,
      summary: {
        totalFeeds: testFeeds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    })
    
  } catch (error) {
    console.error('RSS feed test failed:', error)
    return res.status(500).json({
      error: 'RSS feed test failed',
      details: error.message
    })
  }
}