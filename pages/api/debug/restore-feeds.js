// Restore your RSS feeds including Security.NL
export default async function handler(req, res) {
  try {
    console.log('Restoring RSS feeds...')
    
    const { saveFeedConfigs } = require('../../../lib/feed-manager')
    
    // Restore your feeds including the Security.NL you added
    const yourFeeds = [
      {
        id: 'hackernews-restored',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'tweakers-restored',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'security-nl-restored',
        url: 'https://www.security.nl/rss.xml',
        name: 'Security.NL',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 30
      }
    ]

    await saveFeedConfigs(yourFeeds)
    console.log(`Restored ${yourFeeds.length} RSS feeds`)
    
    // Also clear RSS cache to use new feeds immediately
    const { refreshRSSCache } = require('../../../lib/article-manager')
    refreshRSSCache()
    
    return res.status(200).json({
      success: true,
      message: 'RSS feeds restored successfully',
      feedsRestored: yourFeeds.length,
      feeds: yourFeeds.map(f => ({ name: f.name, url: f.url, enabled: f.enabled }))
    })
    
  } catch (error) {
    console.error('Error restoring feeds:', error)
    return res.status(500).json({
      error: 'Failed to restore feeds',
      details: error.message
    })
  }
}