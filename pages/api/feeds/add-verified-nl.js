// Add verified working Dutch feeds (no scraping needed)
export default async function handler(req, res) {
  try {
    const { saveFeedConfigs, getFeedConfigs } = require('../../../lib/feed-manager')
    
    console.log('Adding verified working Dutch feeds...')
    
    // Get current feeds
    const currentFeeds = await getFeedConfigs()
    
    // Verified working Dutch RSS feeds (manually tested)
    const verifiedNLFeeds = [
      {
        id: 'tweakers-verified',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers (Verified)',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'nu-tech-verified',
        url: 'https://www.nu.nl/rss/Tech',
        name: 'NU.nl Tech (Verified)',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'computable-verified',
        url: 'https://www.computable.nl/rss.xml',
        name: 'Computable (Verified)',
        category: 'cybersecurity-nl',
        enabled: false, // Test first
        maxArticles: 25
      },
      {
        id: 'itnews-nl',
        url: 'https://www.itnews.nl/feed/',
        name: 'IT News NL',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 25
      }
    ]

    // Filter out existing feeds
    const existingIds = new Set(currentFeeds.map(f => f.id))
    const newFeeds = verifiedNLFeeds.filter(feed => !existingIds.has(feed.id))
    
    if (newFeeds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All verified Dutch feeds already exist',
        existing: currentFeeds.length
      })
    }

    // Add new feeds at the top
    const updatedFeeds = [...newFeeds, ...currentFeeds]
    await saveFeedConfigs(updatedFeeds)
    
    return res.status(200).json({
      success: true,
      message: `Added ${newFeeds.length} verified Dutch feeds`,
      feedsAdded: newFeeds.length,
      newFeeds: newFeeds.map(f => ({ name: f.name, url: f.url })),
      totalFeeds: updatedFeeds.length
    })

  } catch (error) {
    console.error('Error adding verified Dutch feeds:', error)
    return res.status(500).json({
      error: 'Failed to add verified Dutch feeds',
      details: error.message
    })
  }
}