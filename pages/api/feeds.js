import { getFeedConfigs, saveFeedConfigs, validateFeedConfig, generateFeedId, DEFAULT_RSS_FEEDS } from '../../lib/feed-manager'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let feeds = await getFeedConfigs()
      
      // If no feeds exist, initialize with working defaults
      if (feeds.length === 0) {
        console.log('No feeds found, initializing with defaults...')
        const defaultFeeds = [
          {
            id: 'hackernews-init',
            url: 'https://feeds.feedburner.com/TheHackersNews',
            name: 'The Hacker News',
            category: 'cybersecurity',
            enabled: true,
            maxArticles: 50
          },
          {
            id: 'tweakers-init',
            url: 'https://feeds.feedburner.com/tweakers/mixed',
            name: 'Tweakers',
            category: 'cybersecurity',
            enabled: true,
            maxArticles: 50
          }
        ]
        
        await saveFeedConfigs(defaultFeeds)
        feeds = defaultFeeds
      }
      
      return res.status(200).json(feeds)
    } catch (error) {
      console.error('Error fetching feeds:', error)
      return res.status(500).json({ error: 'Failed to fetch feeds' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { feeds } = req.body
      
      if (!Array.isArray(feeds)) {
        return res.status(400).json({ error: 'Feeds must be an array' })
      }

      // Validate all feeds
      const validationErrors = []
      feeds.forEach((feed, index) => {
        const errors = validateFeedConfig(feed)
        if (errors.length > 0) {
          validationErrors.push(`Feed ${index + 1}: ${errors.join(', ')}`)
        }
      })

      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation errors',
          details: validationErrors
        })
      }

      await saveFeedConfigs(feeds)
      
      return res.status(200).json({ 
        success: true, 
        message: `${feeds.length} feeds updated` 
      })
    } catch (error) {
      console.error('Error saving feeds:', error)
      return res.status(500).json({ error: 'Failed to save feeds' })
    }
  }

  if (req.method === 'PUT') {
    // Add new feed
    try {
      console.log('PUT /api/feeds - Adding new feed')
      const newFeed = req.body
      console.log('New feed data:', newFeed)
      
      const errors = validateFeedConfig(newFeed)
      console.log('Validation errors:', errors)
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation errors',
          details: errors
        })
      }

      const currentFeeds = await getFeedConfigs()
      console.log('Current feeds count:', currentFeeds.length)
      
      // Generate ID if not provided
      if (!newFeed.id) {
        newFeed.id = generateFeedId(newFeed.name)
      }
      console.log('Generated feed ID:', newFeed.id)

      // Check for duplicate IDs
      if (currentFeeds.some(f => f.id === newFeed.id)) {
        console.log('Duplicate ID found:', newFeed.id)
        return res.status(400).json({ 
          error: 'Feed with this ID already exists' 
        })
      }

      // Add defaults
      const feedWithDefaults = {
        ...newFeed,
        enabled: newFeed.enabled ?? true,
        maxArticles: newFeed.maxArticles ?? 25
      }
      console.log('Feed with defaults:', feedWithDefaults)

      const updatedFeeds = [...currentFeeds, feedWithDefaults]
      await saveFeedConfigs(updatedFeeds)
      console.log('Feed saved successfully')

      return res.status(201).json({ 
        success: true,
        feed: feedWithDefaults,
        message: 'Feed added successfully'
      })
    } catch (error) {
      console.error('Error adding feed:', error)
      return res.status(500).json({ 
        error: 'Failed to add feed',
        details: error.message 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}