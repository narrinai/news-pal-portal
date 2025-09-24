// File-based persistent feed storage
import fs from 'fs'
import path from 'path'

const FEEDS_FILE_PATH = path.join(process.cwd(), 'feeds-persistent.json')

function loadFeedsFromFile() {
  try {
    if (fs.existsSync(FEEDS_FILE_PATH)) {
      const fileData = fs.readFileSync(FEEDS_FILE_PATH, 'utf8')
      const feeds = JSON.parse(fileData)
      console.log(`Loaded ${feeds.length} feeds from persistent file`)
      return feeds
    }
  } catch (error) {
    console.error('Error loading feeds from file:', error)
  }
  return []
}

function saveFeedsToFile(feeds) {
  try {
    fs.writeFileSync(FEEDS_FILE_PATH, JSON.stringify(feeds, null, 2))
    console.log(`Saved ${feeds.length} feeds to persistent file`)
    return true
  } catch (error) {
    console.error('Error saving feeds to file:', error)
    return false
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return stored feeds from file
    const feeds = loadFeedsFromFile()
    return res.status(200).json({
      success: true,
      feeds: feeds,
      count: feeds.length,
      source: 'file-persistent'
    })
  }

  if (req.method === 'POST') {
    // Store feeds to file
    const { feeds } = req.body
    const feedsToSave = feeds || []

    const success = saveFeedsToFile(feedsToSave)

    if (success) {
      return res.status(200).json({
        success: true,
        message: `${feedsToSave.length} feeds stored persistently`,
        feeds: feedsToSave
      })
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to save feeds persistently'
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}