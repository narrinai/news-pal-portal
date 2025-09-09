// Efficient Article Management System
// Only selected articles are stored in Airtable

import { fetchAllFeeds } from './rss-parser'
import { getArticles, createArticle, NewsArticle } from './airtable'

export interface LiveArticle {
  // RSS data (temporary, not stored)
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  category: string
  originalContent: string
  imageUrl?: string
  matchedKeywords?: string[] // Keywords that caused this article to be included
  
  // Status tracking
  isSelected?: boolean // If true, it's in Airtable
  airtableId?: string // ID from Airtable if selected
}

// In-memory cache for RSS articles
let rssCache: LiveArticle[] = []
let lastFetchTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function getLiveArticles(disableFiltering = false): Promise<{
  pending: LiveArticle[]  // From RSS feeds (not in Airtable)
  selected: NewsArticle[] // From Airtable
  rewritten: NewsArticle[]
  published: NewsArticle[]
}> {
  try {
    // Get fresh RSS data if cache is stale
    const now = Date.now()
    if (rssCache.length === 0 || (now - lastFetchTime) > CACHE_DURATION) {
      console.log('Fetching fresh RSS data...')
      const rssArticles = await fetchAllFeeds(disableFiltering)
      
      // Convert to LiveArticle format
      rssCache = rssArticles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        category: article.category,
        originalContent: article.originalContent || '',
        imageUrl: article.imageUrl,
        matchedKeywords: (article as any).matchedKeywords || [],
        isSelected: false
      }))
      
      lastFetchTime = now
      console.log(`RSS cache updated with ${rssCache.length} articles`)
    }

    // Get all articles from Airtable (only selected/rewritten/published)
    const airtableArticles = await getArticles()
    const airtableUrls = new Set(airtableArticles.map(a => a.url))

    // Mark RSS articles as selected if they exist in Airtable
    const pendingArticles = rssCache
      .filter(article => !airtableUrls.has(article.url))
      .map(article => ({ ...article, isSelected: false }))

    const selectedArticles = airtableArticles.filter(a => a.status === 'selected')
    const rewrittenArticles = airtableArticles.filter(a => a.status === 'rewritten')  
    const publishedArticles = airtableArticles.filter(a => a.status === 'published')

    return {
      pending: pendingArticles.slice(0, 50), // Limit for performance
      selected: selectedArticles,
      rewritten: rewrittenArticles,
      published: publishedArticles
    }
  } catch (error) {
    console.error('Error getting live articles:', error)
    throw error
  }
}

export async function selectArticle(article: LiveArticle): Promise<NewsArticle> {
  try {
    // Save to Airtable when selected
    const airtableArticle: Omit<NewsArticle, 'id' | 'createdAt'> = {
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
      status: 'selected',
      category: article.category as NewsArticle['category'],
      originalContent: article.originalContent,
      imageUrl: article.imageUrl
    }

    const created = await createArticle(airtableArticle)
    console.log(`Article selected and saved to Airtable: ${article.title}`)
    
    return {
      id: created.id,
      ...airtableArticle,
      createdAt: created.fields.createdAt as string
    }
  } catch (error) {
    console.error('Error selecting article:', error)
    throw error
  }
}

export function refreshRSSCache(): void {
  // Force refresh RSS cache
  rssCache = []
  lastFetchTime = 0
  console.log('RSS cache cleared - will refresh on next fetch')
}

export function getCacheStatus(): { 
  articleCount: number
  lastUpdate: Date | null 
  isStale: boolean 
} {
  const now = Date.now()
  const isStale = (now - lastFetchTime) > CACHE_DURATION
  
  return {
    articleCount: rssCache.length,
    lastUpdate: lastFetchTime > 0 ? new Date(lastFetchTime) : null,
    isStale
  }
}