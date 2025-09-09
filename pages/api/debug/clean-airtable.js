// Clean old pending articles from Airtable
export default async function handler(req, res) {
  try {
    console.log('Cleaning old pending articles from Airtable...')
    
    const { getArticles, deleteArticle } = require('../../../lib/airtable')
    
    // Get all articles
    const allArticles = await getArticles()
    console.log(`Found ${allArticles.length} total articles in Airtable`)
    
    // Find old pending articles (these cause conflicts with fresh RSS)
    const pendingArticles = allArticles.filter(a => a.status === 'pending')
    console.log(`Found ${pendingArticles.length} old pending articles to clean`)
    
    // Keep only curated articles (selected/rewritten/published)
    const curatedArticles = allArticles.filter(a => 
      a.status === 'selected' || a.status === 'rewritten' || a.status === 'published'
    )
    console.log(`Keeping ${curatedArticles.length} curated articles`)
    
    // Delete old pending articles
    let deleted = 0
    for (const article of pendingArticles) {
      try {
        await deleteArticle(article.id)
        deleted++
        console.log(`Deleted old pending article: ${article.title?.substring(0, 50)}`)
      } catch (error) {
        console.error(`Failed to delete article ${article.id}:`, error.message)
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Airtable cleaned successfully',
      summary: {
        totalArticles: allArticles.length,
        pendingDeleted: deleted,
        curatedKept: curatedArticles.length,
        keptArticles: curatedArticles.map(a => ({
          id: a.id,
          title: a.title?.substring(0, 50),
          status: a.status,
          source: a.source
        }))
      }
    })
    
  } catch (error) {
    console.error('Error cleaning Airtable:', error)
    return res.status(500).json({
      error: 'Failed to clean Airtable',
      details: error.message
    })
  }
}