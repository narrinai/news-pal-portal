// Clear all caches to force fresh data
export default async function handler(req, res) {
  try {
    console.log('Clearing all caches...')
    
    // Clear RSS cache
    const { refreshRSSCache } = require('../../../lib/article-manager')
    refreshRSSCache()
    
    // Clear any global variables
    if (global.persistentFeeds) {
      delete global.persistentFeeds
    }
    
    console.log('All caches cleared successfully')
    
    return res.status(200).json({
      success: true,
      message: 'All caches cleared - next refresh will use fresh data',
      cleared: ['RSS cache', 'persistent feeds cache']
    })
    
  } catch (error) {
    console.error('Error clearing caches:', error)
    return res.status(500).json({
      error: 'Failed to clear caches',
      details: error.message
    })
  }
}