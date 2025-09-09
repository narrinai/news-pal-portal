import { getFeedConfigs, saveFeedConfigs, generateFeedId } from '../../../lib/feed-manager'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const currentFeeds = await getFeedConfigs()
      
      // Major international cybersecurity news feeds
      const internationalCyberFeeds = [
        {
          id: generateFeedId('Krebs on Security'),
          name: 'Krebs on Security',
          url: 'https://krebsonsecurity.com/feed/',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        },
        {
          id: generateFeedId('The Hacker News'),
          name: 'The Hacker News',
          url: 'https://feeds.feedburner.com/TheHackersNews',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        },
        {
          id: generateFeedId('Threatpost'),
          name: 'Threatpost',
          url: 'https://threatpost.com/feed/',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        },
        {
          id: generateFeedId('Dark Reading'),
          name: 'Dark Reading',
          url: 'https://www.darkreading.com/rss_simple.asp',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        },
        {
          id: generateFeedId('SecurityWeek'),
          name: 'SecurityWeek',
          url: 'https://feeds.feedburner.com/Securityweek',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        },
        {
          id: generateFeedId('Bleeping Computer'),
          name: 'Bleeping Computer',
          url: 'https://www.bleepingcomputer.com/feed/',
          category: 'cybersecurity-international',
          enabled: true,
          maxArticles: 15
        }
      ]
      
      // Filter out feeds that already exist
      const existingUrls = new Set(currentFeeds.map(f => f.url))
      const newFeeds = internationalCyberFeeds.filter(feed => !existingUrls.has(feed.url))
      
      if (newFeeds.length === 0) {
        return res.status(200).json({
          success: true,
          feedsAdded: 0,
          message: 'All international cybersecurity feeds are already configured'
        })
      }
      
      const updatedFeeds = [...currentFeeds, ...newFeeds]
      await saveFeedConfigs(updatedFeeds)
      
      console.log(`Added ${newFeeds.length} international cybersecurity feeds`)
      
      return res.status(200).json({
        success: true,
        feedsAdded: newFeeds.length,
        feeds: newFeeds,
        message: `${newFeeds.length} international cybersecurity feeds added successfully`
      })
    } catch (error) {
      console.error('Error adding international cybersecurity feeds:', error)
      return res.status(500).json({
        error: 'Failed to add international cybersecurity feeds',
        details: error.message
      })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}