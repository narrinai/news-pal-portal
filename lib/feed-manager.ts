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

// Default feeds (backwards compatibility)
export const DEFAULT_RSS_FEEDS: RSSFeedConfig[] = [
  {
    id: 'hackernews',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News',
    category: 'cybersecurity-international',
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'krebs',
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security',
    category: 'cybersecurity-international', 
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'securityweek',
    url: 'https://www.securityweek.com/feed/',
    name: 'Security Week',
    category: 'cybersecurity-international',
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'threatpost',
    url: 'https://threatpost.com/feed/',
    name: 'Threatpost',
    category: 'cybersecurity-international',
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'darkreading',
    url: 'https://www.darkreading.com/rss.xml',
    name: 'Dark Reading',
    category: 'cybersecurity-international',
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'security-nl',
    url: 'https://www.security.nl/rss.xml',
    name: 'Security.NL',
    category: 'cybersecurity-nl',
    enabled: true,
    maxArticles: 10
  },
  {
    id: 'computable',
    url: 'https://www.computable.nl/rss.xml',
    name: 'Computable',
    category: 'cybersecurity-nl',
    enabled: true,
    maxArticles: 10
  }
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

// Feed configuration storage/retrieval functions
export async function getFeedConfigs(): Promise<RSSFeedConfig[]> {
  try {
    // Try to get from environment variables or API
    const storedFeeds = process.env.RSS_FEED_CONFIGS
    if (storedFeeds) {
      return JSON.parse(storedFeeds)
    }
    
    // Fallback to defaults
    return DEFAULT_RSS_FEEDS
  } catch (error) {
    console.warn('Error loading feed configs, using defaults:', error)
    return DEFAULT_RSS_FEEDS
  }
}

export async function saveFeedConfigs(feeds: RSSFeedConfig[]): Promise<void> {
  try {
    console.log('Saving RSS feed configs:', feeds.length, 'feeds')
    // TODO: Store in Airtable or persistent storage
    // For now, just log the configuration
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