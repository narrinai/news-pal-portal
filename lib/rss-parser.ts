import Parser from 'rss-parser'
import { NewsArticle } from './airtable'
import { getFeedConfigs, DEFAULT_KEYWORDS } from './feed-manager'

const parser = new Parser()

export async function fetchRSSFeed(feedUrl: string): Promise<any> {
  try {
    const feed = await parser.parseURL(feedUrl)
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
  maxArticles: number = 10,
  customKeywords?: string[]
): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const articles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  for (const item of feed.items.slice(0, maxArticles)) { // Configurable limit
    // Filter for cybersecurity-related content
    const title = item.title || ''
    const description = item.contentSnippet || item.description || ''
    const content = (title + ' ' + description).toLowerCase()
    
    const keywords = customKeywords || DEFAULT_KEYWORDS
    const isRelevant = containsKeywords(content, keywords)
    
    if (isRelevant) {
      articles.push({
        title: item.title || 'No Title',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        source,
        publishedAt: item.pubDate || new Date().toISOString(),
        status: 'pending',
        category,
        originalContent: item.content || item.description || ''
      })
    }
  }
  
  return articles
}

function containsKeywords(content: string, keywords: string[]): boolean {
  return keywords.some(keyword => content.includes(keyword.toLowerCase()))
}

export async function fetchAllFeeds(): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const allArticles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  // Get configurable feeds or fallback to defaults
  const feedConfigs = await getFeedConfigs()
  const enabledFeeds = feedConfigs.filter(feed => feed.enabled)
  
  console.log(`Processing ${enabledFeeds.length} enabled RSS feeds`)
  
  for (const rssFeed of enabledFeeds) {
    try {
      console.log(`Fetching feed: ${rssFeed.name} (${rssFeed.url})`)
      const feed = await fetchRSSFeed(rssFeed.url)
      const articles = await parseArticlesFromFeed(
        feed, 
        rssFeed.name, 
        rssFeed.category as NewsArticle['category'],
        rssFeed.maxArticles || 10,
        rssFeed.keywords
      )
      console.log(`Found ${articles.length} relevant articles from ${rssFeed.name}`)
      allArticles.push(...articles)
    } catch (error) {
      console.error(`Error processing feed ${rssFeed.name}:`, error)
      // Continue with other feeds even if one fails
    }
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