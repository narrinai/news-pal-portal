import { getFeedConfigs, saveFeedConfigs, validateFeedConfig, generateFeedId, DEFAULT_RSS_FEEDS } from '../../lib/feed-manager'
import { loadFeedsFromAirtable, addFeedToAirtable, updateFeedInAirtable, deleteFeedFromAirtable, syncFeedsToAirtable } from '../../lib/airtable-feeds'

const fs = require('fs')
const path = require('path')

const FEEDS_FILE = path.join(process.cwd(), 'feeds-data.json')

function readFeedsFromFile() {
  try {
    if (fs.existsSync(FEEDS_FILE)) {
      const fileData = fs.readFileSync(FEEDS_FILE, 'utf8')
      return JSON.parse(fileData)
    }
  } catch (error) {
    console.error('Error reading feeds file:', error)
  }
  return []
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // PRIORITY 1: Try loading from Airtable first
      console.log('📡 Attempting to load feeds from Airtable...')
      const airtableFeeds = await loadFeedsFromAirtable()

      if (airtableFeeds.length > 0) {
        console.log(`✅ Returning ${airtableFeeds.length} feeds from Airtable`)
        return res.status(200).json(airtableFeeds)
      }

      // PRIORITY 2: Fallback to local feed manager
      console.log('⚠️ No Airtable feeds found, falling back to local storage')
      let feeds = await getFeedConfigs()
      console.log(`✅ Returning ${feeds.length} feeds from local storage`)

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

      // PRIORITY 1: Sync to Airtable
      try {
        await syncFeedsToAirtable(feeds)
        console.log(`✅ Synced ${feeds.length} feeds to Airtable`)
      } catch (airtableError) {
        console.warn('⚠️ Airtable sync failed, saving to local storage:', airtableError.message)
      }

      // PRIORITY 2: Also save to local storage as backup
      try {
        await saveFeedConfigs(feeds)
        console.log(`✅ Saved ${feeds.length} feeds to local storage`)
      } catch (error) {
        console.warn('Local storage save failed:', error)
      }

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

      // Load current feeds from Airtable first, fallback to local
      let currentFeeds = await loadFeedsFromAirtable()
      if (currentFeeds.length === 0) {
        currentFeeds = await getFeedConfigs()
      }
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

      // PRIORITY 1: Add to Airtable
      try {
        await addFeedToAirtable(feedWithDefaults)
        console.log('✅ Feed added to Airtable')
      } catch (airtableError) {
        console.warn('⚠️ Airtable add failed:', airtableError.message)
      }

      // PRIORITY 2: Also save to local storage
      const updatedFeeds = [...currentFeeds, feedWithDefaults]
      await saveFeedConfigs(updatedFeeds)
      console.log('✅ Feed saved to local storage')

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

  if (req.method === 'DELETE') {
    // Delete feed
    try {
      const { feedId } = req.query

      if (!feedId) {
        return res.status(400).json({ error: 'Feed ID is required' })
      }

      console.log('DELETE /api/feeds - Deleting feed:', feedId)

      // PRIORITY 1: Delete from Airtable
      try {
        await deleteFeedFromAirtable(feedId)
        console.log('✅ Feed deleted from Airtable')
      } catch (airtableError) {
        console.warn('⚠️ Airtable delete failed:', airtableError.message)
      }

      // PRIORITY 2: Also delete from local storage
      let currentFeeds = await getFeedConfigs()
      const updatedFeeds = currentFeeds.filter(f => f.id !== feedId)
      await saveFeedConfigs(updatedFeeds)
      console.log('✅ Feed deleted from local storage')

      return res.status(200).json({
        success: true,
        message: 'Feed deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting feed:', error)
      return res.status(500).json({
        error: 'Failed to delete feed',
        details: error.message
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}