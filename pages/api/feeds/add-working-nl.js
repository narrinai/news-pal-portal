// Add working Dutch cybersecurity feeds
export default async function handler(req, res) {
  try {
    const { saveFeedConfigs, getFeedConfigs } = require('../../../lib/feed-manager')
    
    console.log('Adding working Dutch cybersecurity feeds...')
    
    // Get current feeds
    const currentFeeds = await getFeedConfigs()
    
    // Working Dutch feeds (tested)
    const workingNLFeeds = [
      {
        id: 'tweakers-security',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers (Security filter)',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'computable-it',
        url: 'https://www.computable.nl/rss.xml',
        name: 'Computable IT',
        category: 'cybersecurity-nl',
        enabled: false, // Disabled by default since it was 404 before
        maxArticles: 30
      },
      {
        id: 'nu-tech',
        url: 'https://www.nu.nl/rss/Tech',
        name: 'NU.nl Tech',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'rtl-tech',
        url: 'https://www.rtlnieuws.nl/tech/rss.xml',
        name: 'RTL Nieuws Tech',
        category: 'cybersecurity-nl',
        enabled: true,
        maxArticles: 25
      }
    ]

    // Filter out feeds that already exist
    const existingIds = new Set(currentFeeds.map(f => f.id))
    const newFeeds = workingNLFeeds.filter(feed => !existingIds.has(feed.id))
    
    if (newFeeds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All Dutch feeds already exist',
        existing: currentFeeds.length
      })
    }

    // Add new feeds to existing ones
    const updatedFeeds = [...newFeeds, ...currentFeeds]
    await saveFeedConfigs(updatedFeeds)
    
    return res.status(200).json({
      success: true,
      message: `Added ${newFeeds.length} working Dutch cybersecurity feeds`,
      feedsAdded: newFeeds.length,
      newFeeds: newFeeds.map(f => f.name),
      totalFeeds: updatedFeeds.length
    })

  } catch (error) {
    console.error('Error adding Dutch feeds:', error)
    return res.status(500).json({
      error: 'Failed to add Dutch feeds',
      details: error.message
    })
  }
}