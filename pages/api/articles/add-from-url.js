import { createArticle } from '../../../lib/airtable'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 10,
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

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

    console.log(`[ADD-ARTICLE] Starting for URL: ${url}`)

    // Parse URL to get source name
    const sourceName = source || new URL(url).hostname.replace('www.', '')

    // Create article with minimal data - we'll fetch content later if needed
    const article = {
      title: 'Loading...',
      description: 'Article is being fetched...',
      url,
      source: sourceName,
      publishedAt: new Date().toISOString(),
      status: 'selected',
      category,
      originalContent: '',
      matchedKeywords: []
    }

    console.log(`[ADD-ARTICLE] Creating article in Airtable: ${url}`)

    // Save to Airtable first
    const savedArticle = await createArticle(article)

    console.log(`[ADD-ARTICLE] Article saved with ID: ${savedArticle.id}`)

    // Return success immediately - we can update the article later
    return res.status(200).json({
      success: true,
      article: savedArticle,
      message: 'Article added successfully'
    })

  } catch (error) {
    console.error('[ADD-ARTICLE] Error:', error)

    return res.status(500).json({
      error: 'Failed to add article',
      details: error.message
    })
  }
}
