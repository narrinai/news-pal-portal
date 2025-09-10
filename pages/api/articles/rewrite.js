import { updateArticle, getArticles } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, options, customInstructions } = req.body;

    console.log('Rewrite request:', { id, options, hasCustomInstructions: !!customInstructions })

    // Get the original article
    const articles = await getArticles()
    const article = articles.find(a => a.id === id)
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Rewrite the article using AI
    const rewritten = await rewriteArticle(
      article.title,
      article.originalContent || article.description,
      options,
      customInstructions,
      article.url
    )

    // Update the article in Airtable
    const updatedArticle = await updateArticle(id, {
      rewrittenContent: rewritten.content,
      wordpressHtml: rewritten.wordpressHtml,
      title: rewritten.title, // Update title with rewritten version
      status: 'rewritten'
    })

    return res.status(200).json({
      success: true,
      rewritten: {
        title: rewritten.title,
        content: rewritten.content,
        wordpressHtml: rewritten.wordpressHtml
      }
    })
  } catch (error) {
    console.error('Error rewriting article:', error)
    return res.status(500).json({ error: 'Failed to rewrite article' })
  }
}