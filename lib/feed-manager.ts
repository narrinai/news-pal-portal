// Configurable RSS Feed Management System
export interface RSSFeedConfig {
  id: string
  url: string
  name: string
  category: string
  enabled: boolean
  keywords?: string[] // Custom keywords for this feed
  maxArticles?: number // Max articles to fetch per run
  lastFetched?: string
}

// ======================================
// RSS FEEDS GEORGANISEERD PER CATEGORIE
// ======================================

// 🔒 CYBERSECURITY FEEDS (NEDERLANDS EN INTERNATIONAAL)
const CYBERSECURITY_FEEDS: RSSFeedConfig[] = [
  // Nederlandse bronnen
  {
    id: 'security-nl-default',
    url: 'https://www.security.nl/rss/headlines.xml',
    name: 'Security.NL',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'tweakers',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'nu-tech',
    url: 'https://www.nu.nl/rss/Tech',
    name: 'NU.nl Tech',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  // Internationale bronnen
  {
    id: 'hackernews',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'krebs',
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security',
    category: 'cybersecurity', 
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'securityweek',
    url: 'https://www.securityweek.com/feed/',
    name: 'Security Week',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'threatpost',
    url: 'https://threatpost.com/feed/',
    name: 'Threatpost',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'darkreading',
    url: 'https://www.darkreading.com/rss.xml',
    name: 'Dark Reading',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'bleepingcomputer',
    url: 'https://www.bleepingcomputer.com/feed/',
    name: 'BleepingComputer',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'csoonline',
    url: 'https://www.csoonline.com/feed/',
    name: 'CSO Online',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'rss-app-cybersecurity',
    url: 'https://rss.app/feeds/_8Sg3b109sUx8r8Y4.xml',
    name: 'RSS App Cybersecurity Feed',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'rss-app-new-cybersecurity',
    url: 'https://rss.app/feeds/_NgLaShZokHh9UbEF.xml',
    name: 'RSS App New Cybersecurity Feed',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 100
  }
]

// 🏗️ NEDERLANDSE BOUW & TECH FEEDS  
const BOUWCERTIFICATEN_NL_FEEDS: RSSFeedConfig[] = [
  {
    id: 'tweakers-bouw',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers',
    category: 'bouwcertificaten',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'computable',
    url: 'https://www.computable.nl/rss.xml',
    name: 'Computable',
    category: 'bouwcertificaten',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'iculture',
    url: 'https://www.iculture.nl/feed/',
    name: 'iCulture',
    category: 'bouwcertificaten',
    enabled: true,
    maxArticles: 50
  }
]

// 🤖 AI COMPANION FEEDS
const AI_FEEDS: RSSFeedConfig[] = [
  {
    id: 'techcrunch-ai',
    url: 'https://techcrunch.com/feed/',
    name: 'TechCrunch',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'ars-technica-ai',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    name: 'Ars Technica',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 100
  },
  {
    id: 'wired-ai',
    url: 'https://www.wired.com/feed/rss',
    name: 'Wired',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'theverge-ai',
    url: 'https://www.theverge.com/rss/index.xml',
    name: 'The Verge',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  }
]

// 📈 MARKETING FEEDS
const MARKETING_FEEDS: RSSFeedConfig[] = [
  {
    id: 'reuters-marketing',
    url: 'https://feeds.reuters.com/reuters/technologyNews',
    name: 'Reuters Technology',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'bbc-marketing',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    name: 'BBC Technology',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 50
  }
]

// GECOMBINEERDE FEED LIJST
export const DEFAULT_RSS_FEEDS: RSSFeedConfig[] = [
  ...CYBERSECURITY_FEEDS,
  ...BOUWCERTIFICATEN_NL_FEEDS,
  ...AI_FEEDS,
  ...MARKETING_FEEDS
]

// Global keywords for all feeds
export const DEFAULT_KEYWORDS = [
  // English security keywords
  'security', 'cybersecurity', 'hack', 'breach', 'malware', 
  'ransomware', 'phishing', 'vulnerability', 'exploit', 'cyber',
  'attack', 'threat', 'data breach', 'privacy', 'encryption',
  'firewall', 'antivirus', 'zero-day', 'apt', 'ddos',
  
  // Dutch security keywords
  'beveiliging', 'cyberbeveiliging', 'hack', 'inbreuk', 'malware',
  'ransomware', 'phishing', 'kwetsbaarheid', 'exploit', 'cyber',
  'aanval', 'bedreiging', 'datalek', 'privacy', 'encryptie',
  'firewall', 'antivirus', 'zero-day'
]

// In-memory feed storage (simple but effective)
let customFeeds: RSSFeedConfig[] = []

// Feed configuration storage/retrieval functions
export async function getFeedConfigs(): Promise<RSSFeedConfig[]> {
  try {
    // PRIORITY 1: Try to load from Airtable (server-side only)
    if (typeof window === 'undefined') {
      try {
        const { loadFeedsFromAirtable } = require('./airtable-feeds')
        const airtableFeeds = await loadFeedsFromAirtable()
        if (airtableFeeds.length > 0) {
          customFeeds = airtableFeeds
          console.log(`✅ Using ${airtableFeeds.length} feeds from Airtable`)
          return airtableFeeds
        }
      } catch (airtableError) {
        console.warn('Could not load from Airtable, trying fallback methods:', airtableError.message)
      }
    }

    // PRIORITY 2: Try to load from persistent API storage
    try {
      const response = await fetch('http://localhost:3000/api/feeds/store')
      if (response.ok) {
        const data = await response.json()
        if (data.feeds && data.feeds.length > 0) {
          customFeeds = data.feeds
          console.log(`✅ Using ${data.feeds.length} persistent feeds from API storage`)
          return data.feeds
        }
      }
    } catch (apiError) {
      console.warn('Could not load from API storage, trying fallback method:', apiError.message)

      // Fallback: try to get feeds via direct store GET
      try {
        const storeResponse = await fetch('http://localhost:3000/api/feeds/store', { method: 'GET' })
        if (storeResponse.ok) {
          const storeData = await storeResponse.json()
          if (storeData.success && storeData.feeds && storeData.feeds.length > 0) {
            customFeeds = storeData.feeds
            console.log(`✅ Fallback success: Using ${storeData.feeds.length} feeds from store`)
            return storeData.feeds
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback also failed:', fallbackError.message)
      }
    }
    
    // PRIORITY 2: Check memory storage
    if (customFeeds.length > 0) {
      console.log(`✅ Using ${customFeeds.length} custom feeds from memory`)
      return customFeeds
    }

    // PRIORITY 3: Try to load from file system (multiple file locations)
    try {
      const fs = require('fs')
      const path = require('path')

      // Try the new persistent file first
      const persistentFilePath = path.join(process.cwd(), 'feeds-persistent.json')
      if (fs.existsSync(persistentFilePath)) {
        const fileData = fs.readFileSync(persistentFilePath, 'utf8')
        const fileFeeds = JSON.parse(fileData)
        if (fileFeeds && fileFeeds.length > 0) {
          customFeeds = fileFeeds
          console.log(`✅ Loaded ${fileFeeds.length} feeds from persistent file`)
          return fileFeeds
        }
      }

      // Fallback to old file location
      const feedsFilePath = path.join(process.cwd(), 'feeds-data.json')
      if (fs.existsSync(feedsFilePath)) {
        const fileData = fs.readFileSync(feedsFilePath, 'utf8')
        const fileFeeds = JSON.parse(fileData)
        if (fileFeeds && fileFeeds.length > 0) {
          customFeeds = fileFeeds
          console.log(`✅ Loaded ${fileFeeds.length} feeds from legacy file, migrating to persistent storage`)
          // Migrate to new persistent file
          await saveFeedConfigs(fileFeeds)
          return fileFeeds
        }
      }
    } catch (fileError) {
      console.warn('Could not load feeds from file:', fileError.message)
    }

    // PRIORITY 4: Only use defaults if NO persistent file exists
    // Check if persistent file exists to avoid overwriting manual changes
    try {
      const fs = require('fs')
      const path = require('path')
      const persistentFilePath = path.join(process.cwd(), 'feeds-persistent.json')

      if (fs.existsSync(persistentFilePath)) {
        // File exists but couldn't be read earlier - return defaults WITHOUT saving
        console.log('⚠️ Persistent file exists but is empty or unreadable - using defaults WITHOUT overwriting file')
        customFeeds = DEFAULT_RSS_FEEDS
        return DEFAULT_RSS_FEEDS
      }
    } catch (error) {
      console.warn('Could not check for persistent file:', error.message)
    }

    // Only initialize with defaults if no persistent file exists at all
    console.log('🔧 No persistent file found - initializing with defaults and saving...')
    await saveFeedConfigs(DEFAULT_RSS_FEEDS)
    console.log(`✅ Saved ${DEFAULT_RSS_FEEDS.length} default feeds persistently`)
    return DEFAULT_RSS_FEEDS
    
  } catch (error) {
    console.warn('Error loading feed configs:', error)
    // Return working defaults as last resort
    return DEFAULT_RSS_FEEDS.slice(0, 4) // Just a few reliable ones
  }
}

export async function saveFeedConfigs(feeds: RSSFeedConfig[]): Promise<void> {
  try {
    console.log('Saving RSS feed configs:', feeds.length, 'feeds')

    // Store in memory (immediate availability)
    customFeeds = [...feeds]

    // PRIORITY 1: Save to Airtable (server-side only)
    if (typeof window === 'undefined') {
      try {
        const { syncFeedsToAirtable } = require('./airtable-feeds')
        await syncFeedsToAirtable(feeds)
        console.log(`✅ Feeds synced to Airtable (${feeds.length} feeds)`)
      } catch (airtableError) {
        console.warn('Could not sync to Airtable:', airtableError.message)
      }
    }

    // PRIORITY 2: Save to persistent file system as backup
    try {
      const fs = require('fs')
      const path = require('path')
      const persistentFilePath = path.join(process.cwd(), 'feeds-persistent.json')
      fs.writeFileSync(persistentFilePath, JSON.stringify(feeds, null, 2))
      console.log(`✅ Feeds also saved to persistent file system (${feeds.length} feeds)`)
    } catch (fileError) {
      console.warn('Could not save to persistent file system:', fileError.message)
    }

    // Clear RSS cache to force refresh with new feeds
    try {
      const { refreshRSSCache } = require('./article-manager')
      refreshRSSCache()
      console.log('RSS cache cleared - new feeds will be used immediately')
    } catch (cacheError) {
      console.warn('Could not clear RSS cache:', cacheError.message)
    }

    // Log the current configuration
    feeds.forEach(feed => {
      console.log(`- ${feed.name}: ${feed.enabled ? 'enabled' : 'disabled'} (${feed.url})`)
    })
  } catch (error) {
    console.error('Error saving feed configs:', error)
    throw error
  }
}

export function validateFeedConfig(feed: Partial<RSSFeedConfig>): string[] {
  const errors: string[] = []

  if (!feed.url) errors.push('URL is required')
  if (!feed.name) errors.push('Name is required')
  if (!feed.category) errors.push('Category is required')

  if (feed.url) {
    // Normalize URL by adding https:// if missing
    if (!feed.url.startsWith('http://') && !feed.url.startsWith('https://')) {
      feed.url = 'https://' + feed.url
    }

    if (!isValidUrl(feed.url)) {
      errors.push('Invalid URL format')
    }
  }

  return errors
}

function isValidUrl(string: string): boolean {
  try {
    // If URL doesn't start with protocol, add https://
    if (!string.startsWith('http://') && !string.startsWith('https://')) {
      string = 'https://' + string
    }
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function generateFeedId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}