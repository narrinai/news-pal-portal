import Parser from 'rss-parser'
import { NewsArticle } from './airtable'
import { getFeedConfigs, DEFAULT_KEYWORDS } from './feed-manager'

const parser = new Parser()

export async function fetchRSSFeed(feedUrl: string): Promise<any> {
  try {
    console.log(`Fetching RSS from: ${feedUrl}`)
    
    // Set a timeout for RSS parsing
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RSS fetch timeout')), 7000)
    )
    
    const fetchPromise = parser.parseURL(feedUrl)
    
    const feed = await Promise.race([fetchPromise, timeoutPromise]) as any
    console.log(`RSS fetch successful: ${feedUrl} (${feed?.items?.length || 0} items)`)
    return feed
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error)
    throw error
  }
}

export interface RSSArticle extends Omit<NewsArticle, 'id' | 'createdAt'> {
  matchedKeywords?: string[]
}

export async function parseArticlesFromFeed(
  feed: any, 
  source: string, 
  category: NewsArticle['category'],
  maxArticles: number = 50,
  customKeywords?: string[],
  disableFiltering = false,
  categoryKeywords?: {[key: string]: string[]}
): Promise<RSSArticle[]> {
  const articles: RSSArticle[] = []
  
  // Comprehensive default category keywords
  const defaultCategoryKeywords = {
    'cybersecurity-nl': [
      'beveiliging', 'cyberbeveiliging', 'cybersecurity', 'datalek', 'privacy', 'hack', 'hacker', 'malware', 
      'ransomware', 'phishing', 'virus', 'trojan', 'spyware', 'adware', 'botnet', 'ddos', 'firewall',
      'antivirus', 'encryptie', 'encryption', 'vpn', 'ssl', 'tls', 'certificaat', 'kwetsbaarheid',
      'vulnerability', 'exploit', 'patch', 'update', 'beveiligingslek', 'cyberaanval', 'attack',
      'threat', 'dreging', 'risico', 'risk', 'incident', 'breach', 'inbreuk', 'lekken', 'leak',
      'cybercrime', 'cybercriminaliteit', 'fraude', 'identiteitsdiefstal', 'social engineering'
    ],
    'cybersecurity-international': [
      'security', 'cybersecurity', 'cyber security', 'hack', 'hacker', 'breach', 'data breach', 'malware', 
      'ransomware', 'phishing', 'spear phishing', 'vulnerability', 'exploit', 'zero-day', 'zero day',
      'apt', 'advanced persistent threat', 'ddos', 'denial of service', 'firewall', 'antivirus',
      'encryption', 'vpn', 'ssl', 'tls', 'certificate', 'threat', 'cyber attack', 'cyberattack',
      'attack', 'incident', 'response', 'forensics', 'penetration testing', 'pentest', 'soc',
      'siem', 'endpoint protection', 'network security', 'cloud security', 'iot security'
    ],
    'bouwcertificaten-nl': [
      'bouwcertificaat', 'bouw certificaat', 'woningcertificaat', 'energielabel', 'bouwvergunning', 
      'woningbouw', 'certificering', 'bouwtoezicht', 'keuring', 'inspectie', 'architect', 'constructeur'
    ],
    'ai-companion-international': [
      'AI companion', 'AI assistant', 'AI girlfriend', 'AI boyfriend', 'virtual assistant', 'chatbot', 
      'conversational AI', 'character AI', 'companion robot', 'social robot', 'digital human'
    ],
    'ai-learning-international': [
      'AI learning', 'machine learning', 'deep learning', 'neural networks', 'AI education', 'AI training', 
      'AI tutorial', 'AI course', 'data science', 'algorithms', 'programming', 'tensorflow', 'pytorch'
    ],
    'other': [
      'news', 'nieuws', 'update', 'announcement', 'technology', 'innovation', 'business', 'startup'
    ]
  }
  
  const keywordMap = categoryKeywords || defaultCategoryKeywords
  
  for (const item of feed.items.slice(0, maxArticles)) {
    const title = item.title || ''
    const description = item.contentSnippet || item.description || ''
    const content = (title + ' ' + description).toLowerCase()
    
    let bestCategory = 'other' // Default fallback
    let isRelevant = false
    let matchedKeywords: string[] = [] // Declare outside if/else
    
    if (disableFiltering) {
      isRelevant = true
      bestCategory = category // Use feed's default category
      matchedKeywords = [] // Empty for disabled filtering
    } else {
      // Smart categorization: find the best matching category
      let maxMatches = 0

      for (const [cat, keywords] of Object.entries(keywordMap)) {
        const foundKeywords = keywords.filter(keyword =>
          content.includes(keyword.toLowerCase())
        )

        if (foundKeywords.length > maxMatches) {
          maxMatches = foundKeywords.length
          bestCategory = cat
          matchedKeywords = foundKeywords
          isRelevant = foundKeywords.length > 0
        }
      }

      // If keyword matching found a category, use the original feed category instead
      // This ensures consistency with dashboard filtering
      if (isRelevant && category) {
        bestCategory = category
      }

      // Additional logging for debugging
      if (isRelevant) {
        console.log(`Article matched "${bestCategory}" with keywords [${matchedKeywords.join(', ')}]: "${title.substring(0, 50)}..."`)
      } else {
        console.log(`Article skipped - no keyword match: "${title.substring(0, 50)}..."`)
        continue
      }
    }
    
    if (isRelevant) {
      const imageUrl = extractImageFromRSSItem(item)
      
      articles.push({
        title: item.title || 'No Title',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        source,
        publishedAt: item.pubDate || new Date().toISOString(),
        status: 'pending',
        category: bestCategory as NewsArticle['category'],
        originalContent: item.content || item.description || '',
        imageUrl,
        matchedKeywords: matchedKeywords
      })
    }
  }
  
  return articles
}


function extractImageFromRSSItem(item: any): string | undefined {
  try {
    // Try different RSS image fields
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url
    }
    
    if (item['media:thumbnail'] && item['media:thumbnail']['@_url']) {
      return item['media:thumbnail']['@_url']
    }
    
    if (item['media:content'] && item['media:content']['@_url']) {
      return item['media:content']['@_url']
    }
    
    // Try to extract from content
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }
    
    // Try description
    if (item.description) {
      const imgMatch = item.description.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }
    
    return undefined
  } catch (error) {
    console.warn('Error extracting image from RSS item:', error)
    return undefined
  }
}

export async function fetchAllFeeds(disableFiltering = false, categoryKeywords?: {[key: string]: string[]}): Promise<RSSArticle[]> {
  const allArticles: RSSArticle[] = []
  
  // Get configurable feeds or fallback to defaults
  const feedConfigs = await getFeedConfigs()
  const enabledFeeds = feedConfigs.filter(feed => feed.enabled)
  
  console.log(`Processing ${enabledFeeds.length} enabled RSS feeds`)
  
  // Process feeds in smaller batches to avoid timeouts - limit to 20 feeds max
  const feedsToProcess = enabledFeeds.slice(0, 20)
  console.log(`Processing ${feedsToProcess.length} feeds (limited from ${enabledFeeds.length} to prevent timeouts)`)
  
  const batchSize = 3
  for (let i = 0; i < feedsToProcess.length; i += batchSize) {
    const batch = feedsToProcess.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(feedsToProcess.length/batchSize)}`)
    
    const batchPromises = batch.map(async (rssFeed) => {
      try {
        console.log(`Fetching feed: ${rssFeed.name} (${rssFeed.url})`)
        const feed = await fetchRSSFeed(rssFeed.url)
        const articles = await parseArticlesFromFeed(
          feed, 
          rssFeed.name, 
          rssFeed.category as NewsArticle['category'],
          rssFeed.maxArticles || 50,
          rssFeed.keywords,
          disableFiltering,
          categoryKeywords
        )
        console.log(`Found ${articles.length} relevant articles from ${rssFeed.name}`)
        return articles
      } catch (error) {
        console.error(`Error processing feed ${rssFeed.name}:`, error)
        return []
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    batchResults.forEach(articles => allArticles.push(...articles))
  }
  
  // Remove duplicates based on URL
  const uniqueArticles = allArticles.filter((article, index, self) =>
    index === self.findIndex(a => a.url === article.url)
  )
  
  // Sort by published date (newest first)
  uniqueArticles.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  
  return uniqueArticles.slice(0, 50) // Return top 50 most recent articles
}