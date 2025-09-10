// Reset RSS feeds to working defaults - unified cybersecurity category
const WORKING_DEFAULT_FEEDS = [
  {
    id: 'security-nl-reset',
    url: 'https://www.security.nl/rss.xml',
    name: 'Security.NL (Dutch)',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'tweakers-reset',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers (Dutch)',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'hackernews-reset',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News (International)',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'krebs-reset',
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security (International)',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'bleeping-reset',
    url: 'https://www.bleepingcomputer.com/feed/',
    name: 'BleepingComputer (International)',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔧 Resetting RSS feeds to working defaults...')
    
    // Save working defaults via the store API
    const storeResponse = await fetch('http://localhost:3000/api/feeds/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeds: WORKING_DEFAULT_FEEDS })
    })

    if (storeResponse.ok) {
      console.log(`✅ Reset to ${WORKING_DEFAULT_FEEDS.length} working default feeds`)
      
      return res.status(200).json({
        success: true,
        message: `Reset to ${WORKING_DEFAULT_FEEDS.length} working RSS feeds`,
        feeds: WORKING_DEFAULT_FEEDS,
        feedsReset: WORKING_DEFAULT_FEEDS.length
      })
    } else {
      throw new Error('Failed to store reset feeds')
    }
    
  } catch (error) {
    console.error('Error resetting feeds:', error)
    return res.status(500).json({ 
      error: 'Failed to reset feeds',
      details: error.message
    })
  }
}