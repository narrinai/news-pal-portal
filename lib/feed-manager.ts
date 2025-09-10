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
    maxArticles: 50
  },
  {
    id: 'tweakers',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'nos-tech',
    url: 'https://feeds.nos.nl/nosnieuwsalgemeen',
    name: 'NOS Tech',
    category: 'cybersecurity', 
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'nu-tech',
    url: 'https://www.nu.nl/rss/Tech',
    name: 'NU.nl Tech',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'techzine',
    url: 'https://www.techzine.nl/feed/',
    name: 'Techzine',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 40
  },
  // Internationale bronnen
  {
    id: 'hackernews',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'krebs',
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security',
    category: 'cybersecurity', 
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'securityweek',
    url: 'https://www.securityweek.com/feed/',
    name: 'Security Week',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'threatpost',
    url: 'https://threatpost.com/feed/',
    name: 'Threatpost',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'darkreading',
    url: 'https://www.darkreading.com/rss.xml',
    name: 'Dark Reading',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'bleepingcomputer',
    url: 'https://www.bleepingcomputer.com/feed/',
    name: 'BleepingComputer',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'csoonline',
    url: 'https://www.csoonline.com/feed/',
    name: 'CSO Online',
    category: 'cybersecurity',
    enabled: true,
    maxArticles: 50
  }
]

// 🏗️ NEDERLANDSE BOUW & TECH FEEDS  
const BOUWCERTIFICATEN_NL_FEEDS: RSSFeedConfig[] = [
  {
    id: 'tweakers-bouw',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers',
    category: 'bouwcertificaten-nl',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'computable',
    url: 'https://www.computable.nl/rss.xml',
    name: 'Computable',
    category: 'tech-nl',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'techzine',
    url: 'https://www.techzine.nl/feed/',
    name: 'Techzine',
    category: 'tech-nl',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'iculture',
    url: 'https://www.iculture.nl/feed/',
    name: 'iCulture',
    category: 'tech-nl',
    enabled: true,
    maxArticles: 8
  }
]

// 🌐 INTERNATIONALE TECH FEEDS
const TECH_INTERNATIONAL_FEEDS: RSSFeedConfig[] = [
  {
    id: 'techcrunch',
    url: 'https://techcrunch.com/feed/',
    name: 'TechCrunch',
    category: 'tech-international',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'ars-technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    name: 'Ars Technica',
    category: 'tech-international',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'wired',
    url: 'https://www.wired.com/feed/rss',
    name: 'Wired',
    category: 'tech-international',
    enabled: true,
    maxArticles: 8
  },
  {
    id: 'theverge',
    url: 'https://www.theverge.com/rss/index.xml',
    name: 'The Verge',
    category: 'tech-international',
    enabled: true,
    maxArticles: 8
  }
]

// 📰 OVERIGE FEEDS
const OTHER_FEEDS: RSSFeedConfig[] = [
  {
    id: 'reuters-tech',
    url: 'https://feeds.reuters.com/reuters/technologyNews',
    name: 'Reuters Technology',
    category: 'other',
    enabled: true,
    maxArticles: 8
  },
  {
    id: 'bbc-tech',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    name: 'BBC Technology',
    category: 'other',
    enabled: true,
    maxArticles: 8
  }
]

// GECOMBINEERDE FEED LIJST
export const DEFAULT_RSS_FEEDS: RSSFeedConfig[] = [
  ...CYBERSECURITY_FEEDS,
  ...BOUWCERTIFICATEN_NL_FEEDS,
  ...TECH_INTERNATIONAL_FEEDS,
  ...OTHER_FEEDS
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
    // PRIORITY 1: Try to load from persistent API storage
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
      console.warn('Could not load from API storage:', apiError.message)
    }
    
    // PRIORITY 2: Check memory storage
    if (customFeeds.length > 0) {
      console.log(`✅ Using ${customFeeds.length} custom feeds from memory`)
      return customFeeds
    }
    
    // PRIORITY 3: Initialize with defaults and save them persistently
    console.log('🔧 No feeds found - initializing with working defaults and saving persistently...')
    const workingDefaults = [
      {
        id: 'hackernews-persistent',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'tweakers-persistent',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'security-nl-persistent',
        url: 'https://www.security.nl/rss/headlines.xml',
        name: 'Security.NL',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'krebs-persistent',
        url: 'https://krebsonsecurity.com/feed/',
        name: 'Krebs on Security',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      }
    ]
    
    // Save defaults persistently
    await saveFeedConfigs(workingDefaults)
    console.log(`✅ Saved ${workingDefaults.length} default feeds persistently`)
    return workingDefaults
    
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
    
    // Store via API for persistence
    try {
      const response = await fetch('http://localhost:3000/api/feeds/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds })
      })
      if (response.ok) {
        console.log('RSS feeds saved to persistent API storage')
      }
    } catch (apiError) {
      console.warn('Could not save to API storage:', apiError.message)
    }
    
    // Clear RSS cache to force refresh with new feeds
    const { refreshRSSCache } = require('./article-manager')
    refreshRSSCache()
    console.log('RSS cache cleared - new feeds will be used immediately')
    
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
  
  if (feed.url && !isValidUrl(feed.url)) {
    errors.push('Invalid URL format')
  }
  
  return errors
}

function isValidUrl(string: string): boolean {
  try {
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