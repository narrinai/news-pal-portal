// Test security.nl RSS feed specifically
export default async function handler(req, res) {
  try {
    const Parser = require('rss-parser')
    const parser = new Parser()
    
    console.log('Testing security.nl RSS feed...')
    
    // Test security.nl feed directly
    const feedUrl = 'https://www.security.nl/rss.xml'
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 8000)
    )
    
    const fetchPromise = parser.parseURL(feedUrl)
    const feed = await Promise.race([fetchPromise, timeoutPromise])
    
    console.log(`Security.nl feed loaded: ${feed?.items?.length || 0} items`)
    
    // Test keyword filtering on security.nl articles
    const articles = []
    const debugInfo = []
    
    const nlKeywords = ['beveiliging', 'cyberbeveiliging', 'datalek', 'privacy', 'hack', 'malware', 'security', 'cyber']
    
    for (const item of (feed.items || []).slice(0, 15)) {
      const title = item.title || ''
      const description = item.description || item.contentSnippet || ''
      const content = `${title} ${description}`.toLowerCase()
      
      // Check for Dutch security keywords
      const matchedKeywords = nlKeywords.filter(keyword => content.includes(keyword.toLowerCase()))
      const isRelevant = matchedKeywords.length > 0
      
      debugInfo.push({
        title: title.substring(0, 60) + '...',
        matchedKeywords: matchedKeywords,
        isRelevant: isRelevant,
        contentSample: content.substring(0, 150) + '...'
      })
      
      if (isRelevant) {
        articles.push({
          title: title,
          description: description,
          url: item.link || '',
          source: 'Security.NL',
          publishedAt: item.pubDate || new Date().toISOString(),
          category: 'cybersecurity-nl',
          matchedKeywords: matchedKeywords
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      feedUrl: feedUrl,
      totalItems: feed?.items?.length || 0,
      filteredArticles: articles.length,
      articles: articles,
      debugInfo: debugInfo,
      testKeywords: nlKeywords
    })
    
  } catch (error) {
    console.error('Security.nl RSS test failed:', error)
    return res.status(500).json({
      error: 'Security.nl RSS test failed',
      details: error.message
    })
  }
}