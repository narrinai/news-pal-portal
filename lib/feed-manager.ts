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
  disableFiltering?: boolean // If true, accept all articles from this feed without keyword filtering
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
    id: 'wired-ai-specific',
    url: 'https://www.wired.com/feed/tag/ai/latest/rss',
    name: 'Wired - Artificial Intelligence',
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
    enabled: false,
    maxArticles: 25
  },
  {
    id: 'google-ai-blog',
    url: 'https://blog.google/technology/ai/rss/',
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
  },
  {
    id: 'ai-blog-news',
    url: 'https://www.artificial-intelligence.blog/ai-news?format=rss',
    name: 'Artificial Intelligence Blog & News',
    category: 'ai-companion',
    enabled: false,
    maxArticles: 50
  },
  {
    id: 'ashland-genai',
    url: 'https://libguides.ashland.edu/GEN-AI/feed',
    name: 'Ashland University - GenAI Resources',
    category: 'ai-companion',
    enabled: false,
    maxArticles: 25
  },
  {
    id: 'venturebeat-ai',
    url: 'https://venturebeat.com/category/ai/feed/',
    name: 'VentureBeat AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'aiweekly',
    url: 'https://aiweekly.co/feed/',
    name: 'AI Weekly',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'deepmind-blog',
    url: 'https://deepmind.google/blog/rss.xml',
    name: 'Google DeepMind Blog',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'openai-research',
    url: 'https://openai.com/research/rss.xml',
    name: 'OpenAI Research',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'anthropic-news',
    url: 'https://www.anthropic.com/news/rss.xml',
    name: 'Anthropic News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'ai-news-mit',
    url: 'https://news.mit.edu/topic/artificial-intelligence2-rss.xml',
    name: 'MIT AI News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'machinelearningmastery',
    url: 'https://machinelearningmastery.com/feed/',
    name: 'Machine Learning Mastery',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'towards-data-science',
    url: 'https://towardsdatascience.com/feed',
    name: 'Towards Data Science',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'futurism-ai',
    url: 'https://futurism.com/artificial-intelligence/feed',
    name: 'Futurism - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'sciencedaily-ai',
    url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
    name: 'ScienceDaily - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'zdnet-ai',
    url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    name: 'ZDNet - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'forbes-ai',
    url: 'https://www.forbes.com/ai/feed/',
    name: 'Forbes - AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'aitrends',
    url: 'https://www.aitrends.com/feed/',
    name: 'AI Trends',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'artificialintelligence-news',
    url: 'https://www.artificialintelligence-news.com/feed/',
    name: 'AI News',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'marktechpost',
    url: 'https://www.marktechpost.com/feed/',
    name: 'MarkTechPost',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'unite-ai',
    url: 'https://www.unite.ai/feed/',
    name: 'Unite.AI',
    category: 'ai-companion',
    enabled: true,
    maxArticles: 40
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

// 🇪🇺 EUROPEAN PURPOSE FEEDS (European alternatives to US big tech)
const EUROPEAN_PURPOSE_FEEDS: RSSFeedConfig[] = [
  {
    id: 'techeu',
    url: 'https://tech.eu/feed/',
    name: 'Tech.eu',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'sifted-eu',
    url: 'https://sifted.eu/feed',
    name: 'Sifted (European Startups)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'tnw-european',
    url: 'https://thenextweb.com/feed',
    name: 'The Next Web',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'euractiv-digital',
    url: 'https://www.euractiv.com/sections/digital/feed/',
    name: 'Euractiv Digital',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'techcrunch-europe',
    url: 'https://techcrunch.com/feed/',
    name: 'TechCrunch (EU filtered)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'ars-technica-eu',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    name: 'Ars Technica (EU filtered)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'wired-eu',
    url: 'https://www.wired.com/feed/rss',
    name: 'Wired (EU filtered)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'zdnet-eu',
    url: 'https://www.zdnet.com/topic/enterprise-software/rss.xml',
    name: 'ZDNet Enterprise (EU filtered)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'opensource-eu',
    url: 'https://opensource.com/feed',
    name: 'Opensource.com',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'nextcloud-blog',
    url: 'https://nextcloud.com/blog/feed/',
    name: 'Nextcloud Blog',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'proton-blog',
    url: 'https://proton.me/blog/feed',
    name: 'Proton Blog',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 25
  },
  {
    id: 'tweakers-eu',
    url: 'https://feeds.feedburner.com/tweakers/mixed',
    name: 'Tweakers (EU filtered)',
    category: 'europeanpurpose',
    enabled: true,
    maxArticles: 50
  }
]

// 🇩🇪 GERMAN TECH & NEWS FEEDS
const GERMAN_FEEDS: RSSFeedConfig[] = [
  {
    id: 'de-heise-news',
    url: 'https://www.heise.de/rss/heise-atom.xml',
    name: 'Heise Online News',
    category: 'german-news',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'de-golem',
    url: 'https://rss.golem.de/rss.php?feed=RSS2.0',
    name: 'Golem.de',
    category: 'german-tech',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'de-t3n',
    url: 'https://t3n.de/rss.xml',
    name: 't3n Magazin',
    category: 'german-tech',
    enabled: true,
    maxArticles: 50
  },
  {
    id: 'de-handelsblatt',
    url: 'https://www.handelsblatt.com/contentexport/feed/themen/digitalisierung',
    name: 'Handelsblatt Digital',
    category: 'german-business',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'de-spiegel-tech',
    url: 'https://www.spiegel.de/netzwelt/index.rss',
    name: 'Spiegel Netzwelt',
    category: 'german-tech',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'de-chip',
    url: 'https://www.chip.de/rss/rss.xml',
    name: 'CHIP Online',
    category: 'german-tech',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'de-computerwoche',
    url: 'https://www.computerwoche.de/feed/news.rss',
    name: 'Computerwoche',
    category: 'german-tech',
    enabled: true,
    maxArticles: 40
  },
  {
    id: 'de-manager-magazin',
    url: 'https://www.manager-magazin.de/themen/digitalisierung/index.rss',
    name: 'Manager Magazin Digital',
    category: 'german-business',
    enabled: true,
    maxArticles: 40
  }
]

// GECOMBINEERDE FEED LIJST
export const DEFAULT_RSS_FEEDS: RSSFeedConfig[] = [
  ...CYBERSECURITY_FEEDS,
  ...BOUWCERTIFICATEN_NL_FEEDS,
  ...AI_FEEDS,
  ...MARKETING_FEEDS,
  ...EUROPEAN_PURPOSE_FEEDS,
  ...GERMAN_FEEDS
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

    // PRIORITY 2: Check memory storage
    if (customFeeds.length > 0) {
      console.log(`✅ Using ${customFeeds.length} custom feeds from memory`)
      return customFeeds
    }

    // PRIORITY 3: Try to load from file system (local dev only, not available on Netlify)
    if (typeof globalThis.process?.versions?.node !== 'undefined') {
      try {
        const fs = require('fs')
        const path = require('path')

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

        const feedsFilePath = path.join(process.cwd(), 'feeds-data.json')
        if (fs.existsSync(feedsFilePath)) {
          const fileData = fs.readFileSync(feedsFilePath, 'utf8')
          const fileFeeds = JSON.parse(fileData)
          if (fileFeeds && fileFeeds.length > 0) {
            customFeeds = fileFeeds
            console.log(`✅ Loaded ${fileFeeds.length} feeds from legacy file`)
            return fileFeeds
          }
        }
      } catch (fileError) {
        console.warn('Could not load feeds from file:', fileError.message)
      }
    }

    // PRIORITY 4: Fall back to defaults
    console.log('ℹ️ No feeds from Airtable or file system — using defaults')
    customFeeds = DEFAULT_RSS_FEEDS
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

    // PRIORITY 2: Save to persistent file system as backup (local dev only)
    if (typeof globalThis.process?.versions?.node !== 'undefined') {
      try {
        const fs = require('fs')
        const path = require('path')
        const persistentFilePath = path.join(process.cwd(), 'feeds-persistent.json')
        fs.writeFileSync(persistentFilePath, JSON.stringify(feeds, null, 2))
        console.log(`✅ Feeds also saved to persistent file system (${feeds.length} feeds)`)
      } catch (fileError) {
        console.warn('Could not save to persistent file system:', fileError.message)
      }
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