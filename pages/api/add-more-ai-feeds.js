import { syncFeedsToAirtable } from '../../lib/airtable-feeds'

const NEW_AI_FEEDS = [
  {
    id: 'venturebeat-ai',
    url: 'https://venturebeat.com/category/ai/feed/',
    name: 'VentureBeat AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'aiweekly',
    url: 'https://aiweekly.co/feed/',
    name: 'AI Weekly',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'deepmind-blog',
    url: 'https://deepmind.google/blog/rss.xml',
    name: 'Google DeepMind Blog',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'openai-research',
    url: 'https://openai.com/research/rss.xml',
    name: 'OpenAI Research',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'anthropic-news',
    url: 'https://www.anthropic.com/news/rss.xml',
    name: 'Anthropic News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'ai-news-mit',
    url: 'https://news.mit.edu/topic/artificial-intelligence2-rss.xml',
    name: 'MIT AI News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'machinelearningmastery',
    url: 'https://machinelearningmastery.com/feed/',
    name: 'Machine Learning Mastery',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'towards-data-science',
    url: 'https://towardsdatascience.com/feed',
    name: 'Towards Data Science',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Adding more AI feeds to Airtable...')

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
