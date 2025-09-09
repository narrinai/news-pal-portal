// Initialize feeds for first-time setup
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { saveFeedConfigs } = require('../../../lib/feed-manager')
    
    console.log('Initializing RSS feeds with working sources...')
    
    // Only include feeds that we know work
    const workingFeeds = [
      {
        id: 'hackernews',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity-international',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'tweakers',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'security-nl',
        url: 'https://www.security.nl/rss.xml',
        name: 'Security.NL',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 50
      }
    ]

    await saveFeedConfigs(workingFeeds)
    
    return res.status(200).json({
      success: true,
      message: 'RSS feeds initialized with working sources',
      feedsAdded: workingFeeds.length,
      feeds: workingFeeds
    })

  } catch (error) {
    console.error('Error initializing feeds:', error)
    return res.status(500).json({
      error: 'Failed to initialize feeds',
      details: error.message
    })
  }
}