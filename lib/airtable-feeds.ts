import Airtable from 'airtable'
import { RSSFeedConfig } from './feed-manager'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_NEWSPAL
}).base(process.env.AIRTABLE_BASE_NEWSPAL || '')

export async function saveFeedsToAirtable(feeds: RSSFeedConfig[]): Promise<void> {
  try {
    // Clear existing feed configs
    const existingRecords = await base('RSS_Feeds').select().all()
    if (existingRecords.length > 0) {
      const recordIds = existingRecords.map(record => record.id)
      await base('RSS_Feeds').destroy(recordIds)
      console.log(`Cleared ${recordIds.length} existing feed configs`)
    }

    // Save new feed configs
    const recordsToCreate = feeds.map(feed => ({
      fields: {
        feedId: feed.id,
        name: feed.name,
        url: feed.url,
        category: feed.category,
        enabled: feed.enabled,
        maxArticles: feed.maxArticles || 30
      }
    }))

    if (recordsToCreate.length > 0) {
      await base('RSS_Feeds').create(recordsToCreate)
      console.log(`Saved ${feeds.length} RSS feeds to Airtable`)
    }
  } catch (error) {
    console.error('Error saving feeds to Airtable:', error)
    throw error
  }
}

export async function loadFeedsFromAirtable(): Promise<RSSFeedConfig[]> {
  try {
    const records = await base('RSS_Feeds').select({
      sort: [{ field: 'name', direction: 'asc' }]
    }).all()

    const feeds: RSSFeedConfig[] = records.map(record => ({
      id: record.fields.feedId as string,
      name: record.fields.name as string,
      url: record.fields.url as string,
      category: record.fields.category as string,
      enabled: record.fields.enabled as boolean,
      maxArticles: record.fields.maxArticles as number || 30
    }))

    console.log(`Loaded ${feeds.length} RSS feeds from Airtable`)
    return feeds
  } catch (error) {
    console.error('Error loading feeds from Airtable:', error)
    return [] // Return empty array on error
  }
}