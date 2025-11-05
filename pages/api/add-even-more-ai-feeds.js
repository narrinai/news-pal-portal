import { syncFeedsToAirtable } from '../../lib/airtable-feeds'

const NEW_AI_FEEDS = [
  {
    id: 'futurism-ai',
    url: 'https://futurism.com/artificial-intelligence/feed',
    name: 'Futurism - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'sciencedaily-ai',
    url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
    name: 'ScienceDaily - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'zdnet-ai',
    url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    name: 'ZDNet - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'forbes-ai',
    url: 'https://www.forbes.com/ai/feed/',
    name: 'Forbes - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'aitrends',
    url: 'https://www.aitrends.com/feed/',
    name: 'AI Trends',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'artificialintelligence-news',
    url: 'https://www.artificialintelligence-news.com/feed/',
    name: 'AI News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'marktechpost',
    url: 'https://www.marktechpost.com/feed/',
    name: 'MarkTechPost',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'unite-ai',
    url: 'https://www.unite.ai/feed/',
    name: 'Unite.AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Adding even more AI feeds to Airtable...')

    // Load existing feeds from Airtable
    const { loadFeedsFromAirtable } = require('../../lib/airtable-feeds')
    const existingFeeds = await loadFeedsFromAirtable()
    const existingIds = new Set(existingFeeds.map(f => f.id))

    // Filter out feeds that already exist
    const feedsToAdd = NEW_AI_FEEDS.filter(feed => !existingIds.has(feed.id))

    if (feedsToAdd.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All feeds already exist',
        added: 0
      })
    }

    // Add new feeds to existing feeds
    const allFeeds = [...existingFeeds, ...feedsToAdd]

    // Sync to Airtable
    await syncFeedsToAirtable(allFeeds)

    console.log(`✅ Added ${feedsToAdd.length} new AI feeds`)

    return res.status(200).json({
      success: true,
      message: `Successfully added ${feedsToAdd.length} new AI feeds`,
      added: feedsToAdd.length,
      feeds: feedsToAdd.map(f => f.name)
    })
  } catch (error) {
    console.error('Error adding feeds:', error)
    return res.status(500).json({
      error: 'Failed to add feeds',
      details: error.message
    })
  }
}
