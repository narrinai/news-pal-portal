// Migrate existing articles from old category names to new unified categories
import { getArticles, updateArticle } from '../../lib/airtable'

const CATEGORY_MIGRATION_MAP = {
  'cybersecurity-nl': 'cybersecurity',
  'cybersecurity-international': 'cybersecurity',
  'tech-nl': 'cybersecurity', // Also move to cybersecurity
  'tech-international': 'cybersecurity' // Also move to cybersecurity
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Starting category migration...')
    
    // Get all existing articles
    const allArticles = await getArticles()
    console.log(`Found ${allArticles.length} existing articles`)
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const article of allArticles) {
      const newCategory = CATEGORY_MIGRATION_MAP[article.category]
      
      if (newCategory && newCategory !== article.category) {
        try {
          await updateArticle(article.id, { category: newCategory })
          console.log(`✅ Migrated "${article.title.substring(0, 50)}" from ${article.category} to ${newCategory}`)
          migratedCount++
        } catch (error) {
          console.error(`❌ Failed to migrate article ${article.id}:`, error)
          errorCount++
        }
      }
    }
    
    console.log(`🎉 Migration completed: ${migratedCount} articles migrated, ${errorCount} errors`)
    
    return res.status(200).json({
      success: true,
      message: `Category migration completed`,
      totalArticles: allArticles.length,
      migratedArticles: migratedCount,
      errors: errorCount,
      migrationMap: CATEGORY_MIGRATION_MAP
    })
    
  } catch (error) {
    console.error('Error during category migration:', error)
    return res.status(500).json({ 
      error: 'Migration failed',
      details: error.message
    })
  }
}