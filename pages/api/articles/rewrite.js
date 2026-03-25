import { updateArticle, getArticles, getAutomation } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'

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

    // Get brand colors from automation if available
    let brandColorInstructions = ''
    if (article.automation_id) {
      try {
        const automation = await getAutomation(article.automation_id)
        if (automation?.site_brand_colors) {
          const brandColors = JSON.parse(automation.site_brand_colors)
          if (brandColors?.primary) {
            brandColorInstructions = `\n\nBRAND COLORS: Use these colors for all visual elements (stat blocks, charts, bar charts, tables, highlights):\n- Primary accent: ${brandColors.primary}\n- Secondary: ${brandColors.secondary || brandColors.primary}\n- Text: ${brandColors.text || '#374151'}\nDo NOT use the default indigo (#4f46e5). Use the brand colors above instead.`
          }
        }
      } catch {}
    }

    // Rewrite the article using AI
    const rewritten = await rewriteArticle(
      article.title,
      article.originalContent || article.description,
      options,
      (customInstructions || '') + brandColorInstructions || undefined,
      article.url
    )

    // Find a header image if the article doesn't have a real one
    let imageUrl = article.imageUrl
    const isPlaceholder = !imageUrl || imageUrl.includes('placehold.co')
    if (isPlaceholder) {
      try {
        imageUrl = await findHeaderImage(rewritten.title, article.matchedKeywords)
        console.log('Found header image:', imageUrl?.substring(0, 80))
      } catch (err) {
        console.warn('Image search failed:', err.message)
      }
    }

    // Clean AI-generated category (strip quotes, trim) → stored as 'topic' (text field)
    const cleanTopic = rewritten.category
      ? rewritten.category.replace(/^["']+|["']+$/g, '').trim()
      : null

    // Update the article in Airtable
    const updatedArticle = await updateArticle(id, {
      content_rewritten: rewritten.content,
      content_html: rewritten.content_html,
      title: rewritten.title,
      subtitle: rewritten.subtitle || '',
      faq: rewritten.faq ? JSON.stringify(rewritten.faq) : '',
      ...(imageUrl ? { imageUrl } : {}),
      ...(cleanTopic ? { topic: cleanTopic } : {}),
      status: (article.status === 'published' || article.status === 'selected') ? article.status : 'rewritten'
    })

    return res.status(200).json({
      success: true,
      rewritten: {
        title: rewritten.title,
        subtitle: rewritten.subtitle,
        content: rewritten.content,
        content_html: rewritten.content_html,
        faq: rewritten.faq
      }
    })
  } catch (error) {
    console.error('Error rewriting article:', error)
    return res.status(500).json({ error: 'Failed to rewrite article', details: error.message })
  }
}