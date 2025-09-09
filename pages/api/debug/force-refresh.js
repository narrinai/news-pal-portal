// Force complete refresh of all data
export default async function handler(req, res) {
  try {
    console.log('Force refreshing all data...')
    
    // Clear all caches
    const { forceRSSRefresh } = require('../../../lib/article-manager')
    forceRSSRefresh()
    
    // Clear any globals
    if (global.persistentFeeds) {
      delete global.persistentFeeds
    }
    
    console.log('All caches cleared, forcing fresh RSS fetch...')
    
    // Force immediate RSS refresh
    const { getLiveArticles } = require('../../../lib/article-manager')
    const liveData = await getLiveArticles(true) // Disable filtering to get all articles
    
    return res.status(200).json({
      success: true,
      message: 'Complete data refresh completed',
      data: {
        pending: liveData.pending.length,
        selected: liveData.selected.length,
        rewritten: liveData.rewritten.length,
        published: liveData.published.length
      },
      samplePending: liveData.pending.slice(0, 3).map(a => ({
        title: a.title?.substring(0, 50),
        source: a.source,
        category: a.category
      }))
    })
    
  } catch (error) {
    console.error('Force refresh error:', error)
    return res.status(500).json({
      error: 'Force refresh failed',
      details: error.message
    })
  }
}