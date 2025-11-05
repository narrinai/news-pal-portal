import { createArticle } from '../../../lib/airtable'
import * as cheerio from 'cheerio'

// Configure for Vercel serverless
export const config = {
  maxDuration: 10, // Maximum 10 seconds
}

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

    console.log(`[ADD-ARTICLE] Starting fetch for URL: ${url}`)

    // Fetch the webpage with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('[ADD-ARTICLE] Fetch timeout triggered')
      controller.abort()
    }, 5000) // 5 second timeout

    let response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      clearTimeout(timeoutId)
      console.log(`[ADD-ARTICLE] Fetch successful, status: ${response.status}`)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('[ADD-ARTICLE] Fetch failed:', fetchError.message)
      throw fetchError
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`[ADD-ARTICLE] HTML received, length: ${html.length}`)
    const $ = cheerio.load(html)
    console.log('[ADD-ARTICLE] Cheerio loaded successfully')

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

    // Extract main content (simplified - just get text)
    let originalContent = ''
    try {
      const article = $('article').first()
      if (article.length) {
        originalContent = article.text()
      } else {
        originalContent = $('body').text()
      }
      // Clean up whitespace
      originalContent = originalContent.replace(/\s+/g, ' ').trim()
    } catch (e) {
      console.error('Error extracting content:', e)
      originalContent = description
    }

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

    console.log(`[ADD-ARTICLE] Adding article to Airtable: ${article.title}`)

    // Save to Airtable
    const savedArticle = await createArticle(article)

    console.log(`[ADD-ARTICLE] Article saved successfully with ID: ${savedArticle.id}`)

    return res.status(200).json({
      success: true,
      article: savedArticle,
      message: 'Article added successfully'
    })

  } catch (error) {
    console.error('Error adding article from URL:', error)

    // Handle specific error types
    if (error.name === 'AbortError') {
      return res.status(408).json({
        error: 'Request timeout',
        details: 'The website took too long to respond. Please try again.'
      })
    }

    return res.status(500).json({
      error: 'Failed to add article',
      details: error.message
    })
  }
}
