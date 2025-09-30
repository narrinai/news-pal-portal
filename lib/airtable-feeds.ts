import Airtable from 'airtable'
import { RSSFeedConfig } from './feed-manager'

// Check if Airtable credentials are available
const hasAirtableCredentials = !!(process.env.AIRTABLE_TOKEN_NEWSPAL && process.env.AIRTABLE_BASE_NEWSPAL)

let base: any = null

if (hasAirtableCredentials) {
  try {
    base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN_NEWSPAL
    }).base(process.env.AIRTABLE_BASE_NEWSPAL || '')
    console.log('✅ Airtable Feeds initialized successfully')
  } catch (error) {
    console.warn('❌ Airtable Feeds initialization failed')
    base = null
  }
}

const TABLE_NAME = 'rss_feeds'

export async function addFeedToAirtable(feed: RSSFeedConfig): Promise<RSSFeedConfig> {
  if (!base) {
    console.warn('⚠️ Airtable not available for addFeedToAirtable')
    throw new Error('Airtable not available')
  }

  try {
    const record = await base(TABLE_NAME).create({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      category: feed.category,
      enabled: feed.enabled,
      maxarticles: feed.maxArticles || 25
    })

    console.log(`✅ Feed "${feed.name}" added to Airtable`)
    return {
      id: record.fields.id,
      name: record.fields.name,
      url: record.fields.url,
      category: record.fields.category,
      enabled: record.fields.enabled,
      maxArticles: record.fields.maxarticles
    }
  } catch (error) {
    console.error('❌ Error adding feed to Airtable:', error)
    throw error
  }
}

export async function updateFeedInAirtable(feedId: string, updates: Partial<RSSFeedConfig>): Promise<void> {
  if (!base) {
    console.warn('⚠️ Airtable not available for updateFeedInAirtable')
    throw new Error('Airtable not available')
  }

  try {
    // Find record by feedId
    const records = await base(TABLE_NAME).select({
      filterByFormula: `{id} = '${feedId}'`
    }).firstPage()

    if (records.length === 0) {
      throw new Error(`Feed with id ${feedId} not found in Airtable`)
    }

    const recordId = records[0].id
    const updateFields: any = {}

    if (updates.name !== undefined) updateFields.name = updates.name
    if (updates.url !== undefined) updateFields.url = updates.url
    if (updates.category !== undefined) updateFields.category = updates.category
    if (updates.enabled !== undefined) updateFields.enabled = updates.enabled
    if (updates.maxArticles !== undefined) updateFields.maxarticles = updates.maxArticles

    await base(TABLE_NAME).update(recordId, updateFields)
    console.log(`✅ Feed ${feedId} updated in Airtable`)
  } catch (error) {
    console.error('❌ Error updating feed in Airtable:', error)
    throw error
  }
}

export async function deleteFeedFromAirtable(feedId: string): Promise<void> {
  if (!base) {
    console.warn('⚠️ Airtable not available for deleteFeedFromAirtable')
    throw new Error('Airtable not available')
  }

  try {
    // Find record by feedId
    const records = await base(TABLE_NAME).select({
      filterByFormula: `{id} = '${feedId}'`
    }).firstPage()

    if (records.length === 0) {
      throw new Error(`Feed with id ${feedId} not found in Airtable`)
    }

    const recordId = records[0].id
    await base(TABLE_NAME).destroy(recordId)
    console.log(`✅ Feed ${feedId} deleted from Airtable`)
  } catch (error) {
    console.error('❌ Error deleting feed from Airtable:', error)
    throw error
  }
}

export async function loadFeedsFromAirtable(): Promise<RSSFeedConfig[]> {
  if (!base) {
    console.warn('⚠️ Airtable not available for loadFeedsFromAirtable')
    return []
  }

  try {
    const records = await base(TABLE_NAME).select({
      sort: [{ field: 'name', direction: 'asc' }]
    }).all()

    const feeds: RSSFeedConfig[] = records.map(record => ({
      id: record.fields.id as string,
      name: record.fields.name as string,
      url: record.fields.url as string,
      category: record.fields.category as string,
      enabled: record.fields.enabled === true,
      maxArticles: (record.fields.maxarticles as number) || 25
    }))

    console.log(`✅ Loaded ${feeds.length} RSS feeds from Airtable`)
    return feeds
  } catch (error) {
    console.error('❌ Error loading feeds from Airtable:', error)
    return []
  }
}

export async function syncFeedsToAirtable(feeds: RSSFeedConfig[]): Promise<void> {
  if (!base) {
    console.warn('⚠️ Airtable not available for syncFeedsToAirtable')
    throw new Error('Airtable not available')
  }

  try {
    // Get existing records
    const existingRecords = await base(TABLE_NAME).select().all()
    const existingIds = new Set(existingRecords.map(r => r.fields.id))
    const newFeedIds = new Set(feeds.map(f => f.id))

    // Delete feeds that are not in the new list
    const recordsToDelete = existingRecords.filter(r => !newFeedIds.has(r.fields.id))
    if (recordsToDelete.length > 0) {
      await base(TABLE_NAME).destroy(recordsToDelete.map(r => r.id))
      console.log(`🗑️ Deleted ${recordsToDelete.length} feeds from Airtable`)
    }

    // Add or update feeds
    for (const feed of feeds) {
      if (existingIds.has(feed.id)) {
        // Update existing
        const record = existingRecords.find(r => r.fields.id === feed.id)
        if (record) {
          await base(TABLE_NAME).update(record.id, {
            name: feed.name,
            url: feed.url,
            category: feed.category,
            enabled: feed.enabled,
            maxarticles: feed.maxArticles || 25
          })
        }
      } else {
        // Add new
        await base(TABLE_NAME).create({
          id: feed.id,
          name: feed.name,
          url: feed.url,
          category: feed.category,
          enabled: feed.enabled,
          maxarticles: feed.maxArticles || 25
        })
      }
    }

    console.log(`✅ Synced ${feeds.length} RSS feeds to Airtable`)
  } catch (error) {
    console.error('❌ Error syncing feeds to Airtable:', error)
    throw error
  }
}