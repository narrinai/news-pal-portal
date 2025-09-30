// API endpoint to migrate feeds from feeds-persistent.json to Airtable
import { syncFeedsToAirtable } from '../../../lib/airtable-feeds'
const fs = require('fs')
const path = require('path')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🚀 Starting migration of feeds to Airtable...')

    // Read feeds from feeds-persistent.json
    const feedsFilePath = path.join(process.cwd(), 'feeds-persistent.json')

    if (!fs.existsSync(feedsFilePath)) {
      return res.status(404).json({
        error: 'feeds-persistent.json not found',
        message: 'No local feeds file to migrate'
      })
    }

    const feedsData = fs.readFileSync(feedsFilePath, 'utf8')
    const feeds = JSON.parse(feedsData)

    console.log(`📋 Found ${feeds.length} feeds to migrate`)

    // Sync all feeds to Airtable
    await syncFeedsToAirtable(feeds)

    console.log(`✅ Successfully migrated ${feeds.length} feeds to Airtable`)

    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${feeds.length} feeds to Airtable`,
      feedsMigrated: feeds.length,
      feeds: feeds.map(f => ({ id: f.id, name: f.name, category: f.category }))
    })

  } catch (error) {
    console.error('❌ Error during migration:', error)
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message,
      details: error.toString()
    })
  }
}