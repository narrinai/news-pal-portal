// API endpoint to add new AI feeds to Airtable
import { addFeedToAirtable, loadFeedsFromAirtable } from '../../lib/airtable-feeds'

const NEW_AI_FEEDS = [
  {
    id: 'wired-ai-specific',
    url: 'https://www.wired.com/feed/category/artificial-intelligence/latest/rss',
    name: 'Wired - Artificial Intelligence',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'mit-tech-review',
    url: 'https://www.technologyreview.com/feed/',
    name: 'MIT Technology Review',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'openai-blog',
    url: 'https://openai.com/blog/rss/',
    name: 'OpenAI Blog',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'google-ai-blog',
    url: 'https://ai.googleblog.com/feeds/posts/default',
    name: 'Google AI Blog',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'koreai-blog',
    url: 'https://blog.kore.ai/rss.xml',
    name: 'Kore.ai Blog',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'ai-blog-news',
    url: 'https://www.artificial-intelligence.blog/ai-news?format=rss',
    name: 'Artificial Intelligence Blog & News',
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
    console.log('🚀 Starting to add new AI feeds...')

    // Load existing feeds to check for duplicates
    const existingFeeds = await loadFeedsFromAirtable()
    const existingIds = new Set(existingFeeds.map(f => f.id))

    // Filter out feeds that already exist
    const feedsToAdd = NEW_AI_FEEDS.filter(feed => !existingIds.has(feed.id))

    if (feedsToAdd.length === 0) {
      console.log('✨ All new AI feeds already exist!')
      return res.status(200).json({
        success: true,
        message: 'All new AI feeds already exist in Airtable',
        added: 0,
        total: NEW_AI_FEEDS.length
      })
    }

    console.log(`📝 Adding ${feedsToAdd.length} new feeds...`)

    const results = []
    const errors = []

    // Add feeds one by one
    for (const feed of feedsToAdd) {
      try {
        console.log(`Adding: ${feed.name}...`)
        await addFeedToAirtable(feed)
        results.push(feed.name)
        console.log(`✅ Added: ${feed.name}`)
      } catch (error) {
        console.error(`❌ Error adding ${feed.name}:`, error.message)
        errors.push({ feed: feed.name, error: error.message })
      }
    }

    console.log(`\n✅ Successfully added ${results.length} feeds`)

    return res.status(200).json({
      success: true,
      message: `Added ${results.length} new AI feeds`,
      added: results.length,
      total: NEW_AI_FEEDS.length,
      addedFeeds: results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ Error adding AI feeds:', error)
    return res.status(500).json({
      error: 'Failed to add AI feeds',
      details: error.message
    })
  }
}
