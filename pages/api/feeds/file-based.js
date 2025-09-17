// Simple file-based feed storage that always works
const fs = require('fs')
const path = require('path')

const FEEDS_FILE = path.join(process.cwd(), 'feeds-data.json')

// Ensure feeds file exists with default data
function ensureFeedsFile() {
  if (!fs.existsSync(FEEDS_FILE)) {
    const defaultFeeds = [
      {
        id: 'hackernews-persistent',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      }
    ]
    fs.writeFileSync(FEEDS_FILE, JSON.stringify(defaultFeeds, null, 2))
    console.log('Created feeds-data.json with default feeds')
  }
}

export default async function handler(req, res) {
  try {
    ensureFeedsFile()

    if (req.method === 'GET') {
      // Read feeds from file
      const fileData = fs.readFileSync(FEEDS_FILE, 'utf8')
      const feeds = JSON.parse(fileData)

      return res.status(200).json(feeds)
    }

    if (req.method === 'POST') {
      // Write feeds to file
      const { feeds } = req.body

      if (!Array.isArray(feeds)) {
        return res.status(400).json({ error: 'Feeds must be an array' })
      }

      fs.writeFileSync(FEEDS_FILE, JSON.stringify(feeds, null, 2))
      console.log(`Saved ${feeds.length} feeds to file`)

      return res.status(200).json({
        success: true,
        message: `${feeds.length} feeds saved to file`,
        count: feeds.length
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('File-based feeds error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}