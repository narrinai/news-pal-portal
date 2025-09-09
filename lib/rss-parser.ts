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

export async function parseArticlesFromFeed(
  feed: any, 
  source: string, 
  category: NewsArticle['category'],
  maxArticles: number = 20,
  customKeywords?: string[],
  disableFiltering = false
): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const articles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  for (const item of feed.items.slice(0, maxArticles)) { // Configurable limit
    // Filter for cybersecurity-related content
    const title = item.title || ''
    const description = item.contentSnippet || item.description || ''
    const content = (title + ' ' + description).toLowerCase()
    
    // Use broader keyword set for better matching
    const broadKeywords = [
      'security', 'cybersecurity', 'hack', 'hacker', 'breach', 'malware', 
      'ransomware', 'phishing', 'vulnerability', 'exploit', 'cyber',
      'attack', 'threat', 'privacy', 'encryption', 'data breach',
      'zero-day', 'apt', 'ddos', 'firewall', 'antivirus',
      'beveiliging', 'cyberbeveiliging', 'datalek', 'hack', 'malware'
    ]
    // Skip filtering if disabled, otherwise use keywords
    const keywords = customKeywords || broadKeywords
    const isRelevant = disableFiltering ? true : containsKeywords(content, keywords)
    
    if (isRelevant) {
      // Extract image from RSS item
      const imageUrl = extractImageFromRSSItem(item)
      
      articles.push({
        title: item.title || 'No Title',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        source,
        publishedAt: item.pubDate || new Date().toISOString(),
        status: 'pending',
        category,
        originalContent: item.content || item.description || '',
        imageUrl
      })
    }
  }
  
  return articles
}

function containsKeywords(content: string, keywords: string[]): boolean {
  return keywords.some(keyword => content.includes(keyword.toLowerCase()))
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

export async function fetchAllFeeds(disableFiltering = false): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const allArticles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  // Get configurable feeds or fallback to defaults
  const feedConfigs = await getFeedConfigs()
  const enabledFeeds = feedConfigs.filter(feed => feed.enabled)
  
  console.log(`Processing ${enabledFeeds.length} enabled RSS feeds`)
  
  // Process feeds in smaller batches to avoid timeouts - limit to 10 feeds max
  const feedsToProcess = enabledFeeds.slice(0, 10)
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
          rssFeed.maxArticles || 20,
          rssFeed.keywords,
          disableFiltering
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