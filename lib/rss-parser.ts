import Parser from 'rss-parser'
import { NewsArticle } from './airtable'

const parser = new Parser()

export interface RSSFeed {
  url: string
  name: string
  category: 'cybersecurity-nl' | 'cybersecurity-international' | 'other'
}

export const RSS_FEEDS: RSSFeed[] = [
  // International Cybersecurity
  {
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News',
    category: 'cybersecurity-international'
  },
  {
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security',
    category: 'cybersecurity-international'
  },
  {
    url: 'https://www.securityweek.com/feed/',
    name: 'Security Week',
    category: 'cybersecurity-international'
  },
  {
    url: 'https://threatpost.com/feed/',
    name: 'Threatpost',
    category: 'cybersecurity-international'
  },
  {
    url: 'https://www.darkreading.com/rss.xml',
    name: 'Dark Reading',
    category: 'cybersecurity-international'
  },
  // Dutch Cybersecurity
  {
    url: 'https://www.security.nl/rss.xml',
    name: 'Security.NL',
    category: 'cybersecurity-nl'
  },
  {
    url: 'https://www.computable.nl/rss.xml',
    name: 'Computable',
    category: 'cybersecurity-nl'
  }
]

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
  category: NewsArticle['category']
): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const articles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  for (const item of feed.items.slice(0, 10)) { // Take only latest 10 articles
    // Filter for cybersecurity-related content
    const title = item.title || ''
    const description = item.contentSnippet || item.description || ''
    const content = (title + ' ' + description).toLowerCase()
    
    const isRelevant = containsSecurityKeywords(content)
    
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

function containsSecurityKeywords(content: string): boolean {
  const keywords = [
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
  
  return keywords.some(keyword => content.includes(keyword))
}

export async function fetchAllFeeds(): Promise<Omit<NewsArticle, 'id' | 'createdAt'>[]> {
  const allArticles: Omit<NewsArticle, 'id' | 'createdAt'>[] = []
  
  for (const rssFeed of RSS_FEEDS) {
    try {
      const feed = await fetchRSSFeed(rssFeed.url)
      const articles = await parseArticlesFromFeed(feed, rssFeed.name, rssFeed.category)
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