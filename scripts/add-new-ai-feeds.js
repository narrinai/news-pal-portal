// Script to add new AI feeds to Airtable
const Airtable = require('airtable')
const fs = require('fs')
const path = require('path')

// New AI feeds to add
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
  }
]

const TABLE_NAME = 'rss_feeds'

async function getCredentials() {
  const token = process.env.AIRTABLE_TOKEN_NEWSPAL
  const baseId = process.env.AIRTABLE_BASE_NEWSPAL

  if (token && baseId) {
    return { token, baseId }
  }

  // Try to read from .env or .env.local file
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ]

  for (const envPath of envPaths) {
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
  }

  console.error('❌ Error: Could not find Airtable credentials')
  console.log('Please set AIRTABLE_TOKEN_NEWSPAL and AIRTABLE_BASE_NEWSPAL in .env file')
  process.exit(1)
}

async function addNewAIFeeds() {
  try {
    console.log('🚀 Starting to add new AI feeds to Airtable...\n')

    // Get credentials
    const credentials = await getCredentials()
    const base = new Airtable({ apiKey: credentials.token }).base(credentials.baseId)

    console.log('✅ Connected to Airtable\n')

    // Check existing feeds to avoid duplicates
    console.log('📋 Checking for existing feeds...')
    const existingRecords = await base(TABLE_NAME).select().all()
    const existingIds = new Set(existingRecords.map(r => r.fields.id))

    // Filter out feeds that already exist
    const feedsToAdd = NEW_AI_FEEDS.filter(feed => !existingIds.has(feed.id))

    if (feedsToAdd.length === 0) {
      console.log('\n✨ All new AI feeds already exist in Airtable!')
      return
    }

    console.log(`\n📝 Found ${feedsToAdd.length} new feeds to add:\n`)
    feedsToAdd.forEach(feed => {
      console.log(`   - ${feed.name}`)
    })
    console.log('')

    // Add feeds in batches of 10 (Airtable limit)
    const batchSize = 10
    let addedCount = 0

    for (let i = 0; i < feedsToAdd.length; i += batchSize) {
      const batch = feedsToAdd.slice(i, i + batchSize)

      const recordsToCreate = batch.map(feed => ({
        fields: {
          id: feed.id,
          name: feed.name,
          url: feed.url,
          category: feed.category,
          enabled: feed.enabled,
          maxarticles: feed.maxArticles
        }
      }))

      try {
        const createdRecords = await base(TABLE_NAME).create(recordsToCreate)
        addedCount += createdRecords.length

        console.log(`✅ Added batch ${Math.floor(i / batchSize) + 1}:`)
        createdRecords.forEach(record => {
          console.log(`   ✓ ${record.fields.name}`)
        })
        console.log('')
      } catch (error) {
        console.error(`❌ Error adding batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      }

      // Small delay to avoid rate limits
      if (i + batchSize < feedsToAdd.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log('='.repeat(60))
    console.log('📊 Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Successfully added: ${addedCount} feeds`)
    console.log(`📋 Total new feeds: ${NEW_AI_FEEDS.length}`)
    console.log('='.repeat(60))

    if (addedCount === feedsToAdd.length) {
      console.log('\n🎉 All new AI feeds successfully added to Airtable!')
      console.log('They should now appear in your dashboard at:')
      console.log('https://newspalportal.netlify.app/dashboard/settings?tab=feeds')
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
addNewAIFeeds()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
