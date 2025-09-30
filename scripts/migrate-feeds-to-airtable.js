// Script to migrate feeds from feeds-persistent.json to Airtable
const fs = require('fs')
const path = require('path')
const Airtable = require('airtable')

// Prompt user for credentials if not in environment
async function getCredentials() {
  const token = process.env.AIRTABLE_TOKEN_NEWSPAL
  const baseId = process.env.AIRTABLE_BASE_NEWSPAL

  if (token && baseId) {
    return { token, baseId }
  }

  // Try to read from .env file
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const tokenMatch = envContent.match(/AIRTABLE_TOKEN_NEWSPAL=(.+)/)
    const baseMatch = envContent.match(/AIRTABLE_BASE_NEWSPAL=(.+)/)

    if (tokenMatch && baseMatch) {
      return {
        token: tokenMatch[1].trim(),
        baseId: baseMatch[1].trim()
      }
    }
  }

  console.error('❌ Error: Could not find Airtable credentials')
  console.log('Please set AIRTABLE_TOKEN_NEWSPAL and AIRTABLE_BASE_NEWSPAL in .env file')
  process.exit(1)
}

let base

const TABLE_NAME = 'rss_feeds'

async function migrateFeedsToAirtable() {
  try {
    console.log('🚀 Starting migration of feeds to Airtable...\n')

    // Get credentials
    const credentials = await getCredentials()
    base = new Airtable({ apiKey: credentials.token }).base(credentials.baseId)

    console.log('✅ Connected to Airtable\n')

    // Read feeds from feeds-persistent.json
    const feedsFilePath = path.join(__dirname, '..', 'feeds-persistent.json')
    const feedsData = fs.readFileSync(feedsFilePath, 'utf8')
    const feeds = JSON.parse(feedsData)

    console.log(`📋 Found ${feeds.length} feeds to migrate\n`)

    // Check if table already has records
    const existingRecords = await base(TABLE_NAME).select({ maxRecords: 1 }).firstPage()

    if (existingRecords.length > 0) {
      console.log('⚠️  Warning: Airtable table already contains records.')
      console.log('This script will add feeds, not replace existing ones.\n')
    }

    // Migrate feeds in batches of 10 (Airtable limit)
    const batchSize = 10
    let migratedCount = 0
    let skippedCount = 0

    for (let i = 0; i < feeds.length; i += batchSize) {
      const batch = feeds.slice(i, i + batchSize)

      const recordsToCreate = batch.map(feed => ({
        fields: {
          id: feed.id,
          name: feed.name,
          url: feed.url,
          category: feed.category,
          enabled: feed.enabled,
          maxarticles: feed.maxArticles || 25
        }
      }))

      try {
        const createdRecords = await base(TABLE_NAME).create(recordsToCreate)
        migratedCount += createdRecords.length

        console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}: ${createdRecords.length} feeds`)
        createdRecords.forEach(record => {
          console.log(`   - ${record.fields.name} (${record.fields.category})`)
        })
      } catch (error) {
        console.error(`❌ Error migrating batch ${Math.floor(i / batchSize) + 1}:`, error.message)
        skippedCount += batch.length
      }

      // Small delay to avoid rate limits
      if (i + batchSize < feeds.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Successfully migrated: ${migratedCount} feeds`)
    console.log(`❌ Failed/Skipped: ${skippedCount} feeds`)
    console.log(`📋 Total feeds: ${feeds.length}`)
    console.log('='.repeat(60))

    if (migratedCount === feeds.length) {
      console.log('\n🎉 All feeds successfully migrated to Airtable!')
    } else {
      console.log('\n⚠️  Some feeds could not be migrated. Check the errors above.')
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run migration
migrateFeedsToAirtable()
  .then(() => {
    console.log('\n✨ Migration complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })