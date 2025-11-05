import { createArticle } from '../../../lib/airtable'
import * as cheerio from 'cheerio'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url, category, source } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' })
    }

    console.log(`Fetching article from URL: ${url}`)

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract title
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() ||
                'No title found'

    // Extract description
    let description = $('meta[property="og:description"]').attr('content') ||
                     $('meta[name="twitter:description"]').attr('content') ||
                     $('meta[name="description"]').attr('content') ||
                     ''

    // Extract image
    let imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   undefined

    // Extract main content (try various selectors)
    let originalContent = $('article').html() ||
                         $('.article-content').html() ||
                         $('.post-content').html() ||
                         $('main').html() ||
                         $('body').html() ||
                         ''

    // Clean up the content - remove scripts, styles, etc.
    const contentCleaner = cheerio.load(originalContent)
    contentCleaner('script').remove()
    contentCleaner('style').remove()
    contentCleaner('iframe').remove()
    originalContent = contentCleaner.html()

    // Determine source from URL if not provided
    const sourceName = source || new URL(url).hostname.replace('www.', '')

    const article = {
      title: title.trim(),
      description: description.trim() || title.trim(),
      url,
      source: sourceName,
      publishedAt: new Date().toISOString(),
      status: 'selected',
      category,
      originalContent: originalContent.substring(0, 50000), // Limit content size
      imageUrl,
      matchedKeywords: []
    }

    console.log(`Adding article: ${article.title}`)

    // Save to Airtable
    const savedArticle = await createArticle(article)

    return res.status(200).json({
      success: true,
      article: savedArticle,
      message: 'Article added successfully'
    })

  } catch (error) {
    console.error('Error adding article from URL:', error)
    return res.status(500).json({
      error: 'Failed to add article',
      details: error.message
    })
  }
}
