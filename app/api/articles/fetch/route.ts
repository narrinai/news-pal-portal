import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '../../../../lib/rss-parser'
import { createArticle, getArticles } from '../../../../lib/airtable'

export async function POST() {
  try {
    // Fetch articles from RSS feeds
    const articles = await fetchAllFeeds()
    
    // Get existing articles to avoid duplicates
    const existingArticles = await getArticles()
    const existingUrls = new Set(existingArticles.map(article => article.url))
    
    // Filter out articles that already exist
    const newArticles = articles.filter(article => !existingUrls.has(article.url))
    
    // Store new articles in Airtable
    const createdArticles = []
    for (const article of newArticles.slice(0, 20)) { // Limit to 20 new articles at a time
      try {
        const created = await createArticle(article)
        createdArticles.push(created)
      } catch (error) {
        console.error('Error creating article:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${createdArticles.length} new articles added`,
      totalFetched: articles.length,
      newArticles: createdArticles.length
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}