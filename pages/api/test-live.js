// Simple test endpoint to debug live articles functionality
export default async function handler(req, res) {
  try {
    console.log('Testing live articles API...')
    
    // Test RSS parser directly
    const { fetchAllFeeds } = require('../../lib/rss-parser')
    console.log('RSS parser imported successfully')
    
    const rssArticles = await fetchAllFeeds()
    console.log(`RSS fetch completed: ${rssArticles.length} articles`)
    
    // Test Airtable connection
    const { getArticles } = require('../../lib/airtable')
    console.log('Airtable imported successfully')
    
    const airtableArticles = await getArticles()
    console.log(`Airtable fetch completed: ${airtableArticles.length} articles`)
    
    return res.status(200).json({
      success: true,
      rssCount: rssArticles.length,
      airtableCount: airtableArticles.length,
      rssExample: rssArticles[0] || null,
      airtableExample: airtableArticles[0] || null
    })
    
  } catch (error) {
    console.error('Test live API error:', error)
    return res.status(500).json({
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    })
  }
}