import { NextRequest, NextResponse } from 'next/server'
import { updateArticle, getArticles } from '../../../../../lib/airtable'
import { rewriteArticle, RewriteOptions } from '../../../../../lib/ai-rewriter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const articleId = params.id
    const options: RewriteOptions = body.options || {}

    // Get the original article
    const articles = await getArticles()
    const article = articles.find(a => a.id === articleId)
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Rewrite the article using AI
    const rewritten = await rewriteArticle(
      article.title,
      article.originalContent || article.description,
      options
    )

    // Update the article in Airtable
    const updatedArticle = await updateArticle(articleId, {
      rewrittenContent: rewritten.content,
      wordpressHtml: rewritten.wordpressHtml,
      title: rewritten.title, // Update title with rewritten version
      status: 'rewritten'
    })

    return NextResponse.json({
      success: true,
      rewritten: {
        title: rewritten.title,
        content: rewritten.content,
        wordpressHtml: rewritten.wordpressHtml
      }
    })
  } catch (error) {
    console.error('Error rewriting article:', error)
    return NextResponse.json(
      { error: 'Failed to rewrite article' },
      { status: 500 }
    )
  }
}