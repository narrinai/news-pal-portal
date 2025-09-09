// Security.NL web scraper API
import { scrapeWebsite } from '../../../lib/web-scraper'

export default async function handler(req, res) {
  try {
    console.log('Starting Security.NL web scraping...')
    
    // Security.NL scraping configuration
    const securityNLConfig = {
      id: 'security-nl-scrape',
      name: 'Security.NL (Scraping)',
      baseUrl: 'https://www.security.nl',
      listUrl: 'https://www.security.nl/nieuws',
      category: 'cybersecurity-nl',
      selectors: {
        articleLinks: 'article a[href*="/nieuws/"], .news-item a, h2 a, h3 a',
        title: 'h1, .article-title, .entry-title, .post-title',
        description: '.excerpt, .entry-summary, .post-excerpt, p:first-of-type',
        content: '.content, .entry-content, .post-content, article',
        publishedAt: '.date, .published, time, .post-date'
      },
      maxArticles: 15,
      enabled: true
    }

    // Scrape Security.NL
    const articles = await scrapeWebsite(securityNLConfig)
    
    // Filter for cybersecurity keywords
    const keywords = ['beveiliging', 'cyberbeveiliging', 'security', 'hack', 'datalek', 'privacy', 'malware', 'cyber', 'ransomware', 'phishing']
    
    const filteredArticles = articles.filter(article => {
      const content = `${article.title} ${article.description}`.toLowerCase()
      return keywords.some(keyword => content.includes(keyword.toLowerCase()))
    })

    console.log(`Scraped ${articles.length} total, ${filteredArticles.length} security-related articles`)

    return res.status(200).json({
      success: true,
      source: 'Security.NL (Web Scraping)',
      url: securityNLConfig.listUrl,
      totalArticles: articles.length,
      securityArticles: filteredArticles.length,
      articles: filteredArticles,
      scrapingMethod: 'Cheerio HTML parsing',
      selectors: securityNLConfig.selectors
    })

  } catch (error) {
    console.error('Security.NL scraping failed:', error)
    return res.status(500).json({
      error: 'Security.NL scraping failed',
      details: error.message,
      suggestion: 'Website structure may have changed or site is blocking requests'
    })
  }
}