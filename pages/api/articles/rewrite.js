import { updateArticle, getArticles, getAutomation } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, options, customInstructions, sync } = req.body;

    console.log('Rewrite request:', { id, options, sync, hasCustomInstructions: !!customInstructions })

    // Get the original article
    const articles = await getArticles()
    const article = articles.find(a => a.id === id)

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Fire-and-forget mode (default): respond immediately, rewrite in background
    if (!sync) {
      // Save original status so we can restore it after rewrite
      const originalStatus = article.status
      res.status(202).json({ success: true, message: 'Rewrite started', articleId: id })

      // Do the actual rewrite after responding
      try {
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

        const rewritten = await rewriteArticle(
          article.title,
          article.originalContent || article.description,
          options,
          (customInstructions || '') + brandColorInstructions || undefined,
          article.url
        )

        let imageUrl = article.imageUrl
        const isPlaceholder = !imageUrl || imageUrl.includes('placehold.co')
        if (isPlaceholder) {
          try {
            imageUrl = await findHeaderImage(rewritten.title, article.matchedKeywords)
          } catch {}
        }

        const cleanTopic = rewritten.category?.replace(/^["']+|["']+$/g, '').trim() || null

        await updateArticle(id, {
          content_rewritten: rewritten.content,
          content_html: rewritten.content_html,
          title: rewritten.title,
          subtitle: rewritten.subtitle || '',
          faq: rewritten.faq ? JSON.stringify(rewritten.faq) : '',
          ...(imageUrl ? { imageUrl } : {}),
          ...(cleanTopic ? { topic: cleanTopic } : {}),
          status: (originalStatus === 'published' || originalStatus === 'selected') ? originalStatus : 'rewritten'
        })
        console.log(`✅ Background rewrite done: ${rewritten.title?.substring(0, 50)}`)
      } catch (bgError) {
        console.error('Background rewrite failed:', bgError.message)
      }
      return
    }

    // Synchronous mode (sync=true): wait for rewrite and return result
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

    const rewritten = await rewriteArticle(
      article.title,
      article.originalContent || article.description,
      options,
      (customInstructions || '') + brandColorInstructions || undefined,
      article.url
    )

    let imageUrl = article.imageUrl
    const isPlaceholder = !imageUrl || imageUrl.includes('placehold.co')
    if (isPlaceholder) {
      try {
        imageUrl = await findHeaderImage(rewritten.title, article.matchedKeywords)
      } catch {}
    }

    const cleanTopic = rewritten.category?.replace(/^["']+|["']+$/g, '').trim() || null

    await updateArticle(id, {
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