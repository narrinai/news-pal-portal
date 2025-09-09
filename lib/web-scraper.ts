// Web scraper for websites without working RSS feeds
import * as cheerio from 'cheerio'

export interface ScrapedArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  category: string
  originalContent?: string
}

export interface ScrapingConfig {
  id: string
  name: string
  baseUrl: string
  listUrl: string
  category: string
  selectors: {
    articleLinks: string
    title: string
    description?: string
    content?: string
    publishedAt?: string
  }
  maxArticles: number
  enabled: boolean
}

// Scraping configurations for different sites
export const SCRAPING_CONFIGS: ScrapingConfig[] = [
  {
    id: 'security-nl-scrape',
    name: 'Security.NL (Scraping)',
    baseUrl: 'https://www.security.nl',
    listUrl: 'https://www.security.nl/nieuws',
    category: 'cybersecurity-nl',
    selectors: {
      articleLinks: 'article h2 a, .news-item a, .article-title a',
      title: 'h1, .article-title, .entry-title',
      description: '.excerpt, .entry-summary, p:first-of-type',
      content: '.content, .entry-content, .post-content',
      publishedAt: '.date, .published, time'
    },
    maxArticles: 20,
    enabled: true
  }
]

export async function scrapeWebsite(config: ScrapingConfig): Promise<ScrapedArticle[]> {
  try {
    console.log(`Scraping ${config.name} from ${config.listUrl}`)
    
    // Fetch the main page
    const response = await fetch(config.listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0; +https://newspal.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    const articles: ScrapedArticle[] = []
    const articleLinks = $(config.selectors.articleLinks).slice(0, config.maxArticles)
    
    console.log(`Found ${articleLinks.length} article links`)
    
    // Process each article link
    for (let i = 0; i < Math.min(articleLinks.length, 10); i++) {
      try {
        const linkElement = articleLinks.eq(i)
        let articleUrl = linkElement.attr('href') || ''
        
        // Make URL absolute if relative
        if (articleUrl.startsWith('/')) {
          articleUrl = config.baseUrl + articleUrl
        }
        
        if (!articleUrl.startsWith('http')) {
          continue // Skip invalid URLs
        }

        // Extract title from link text or fetch article page
        let title = linkElement.text().trim()
        let description = ''
        let content = ''
        let publishedAt = new Date().toISOString()

        // Try to get more details by fetching the article page
        try {
          const articleResponse = await fetch(articleUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0; +https://newspal.app)',
            }
          })

          if (articleResponse.ok) {
            const articleHtml = await articleResponse.text()
            const article$ = cheerio.load(articleHtml)
            
            // Extract title if not found in link
            if (!title) {
              title = article$(config.selectors.title).first().text().trim()
            }
            
            // Extract description
            if (config.selectors.description) {
              description = article$(config.selectors.description).first().text().trim()
            }
            
            // Extract content
            if (config.selectors.content) {
              content = article$(config.selectors.content).first().text().trim()
            }
            
            // Extract published date
            if (config.selectors.publishedAt) {
              const dateText = article$(config.selectors.publishedAt).first().text().trim()
              if (dateText) {
                publishedAt = new Date(dateText).toISOString()
              }
            }
          }
        } catch (articleError) {
          console.warn(`Could not fetch article details for ${articleUrl}:`, articleError.message)
        }

        if (title && articleUrl) {
          articles.push({
            title,
            description: description || title,
            url: articleUrl,
            source: config.name,
            publishedAt,
            category: config.category,
            originalContent: content
          })
        }
      } catch (itemError) {
        console.warn(`Error processing article ${i}:`, itemError.message)
      }
    }
    
    console.log(`Successfully scraped ${articles.length} articles from ${config.name}`)
    return articles

  } catch (error) {
    console.error(`Error scraping ${config.name}:`, error)
    throw error
  }
}

export async function scrapeAllSites(): Promise<ScrapedArticle[]> {
  const allArticles: ScrapedArticle[] = []
  
  for (const config of SCRAPING_CONFIGS.filter(c => c.enabled)) {
    try {
      const articles = await scrapeWebsite(config)
      allArticles.push(...articles)
    } catch (error) {
      console.error(`Failed to scrape ${config.name}:`, error)
      // Continue with other sites
    }
  }
  
  return allArticles
}