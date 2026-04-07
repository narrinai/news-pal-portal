import { updateArticle, getArticles, getAutomation } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, options, customInstructions, _background } = req.body;

    console.log('Rewrite request:', { id, options, _background, hasCustomInstructions: !!customInstructions })

    // Get the original article
    const articles = await getArticles()
    const article = articles.find(a => a.id === id)

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // If not a background call, dispatch the work to a new function invocation and return immediately
    if (!_background) {
      // Determine our own URL for the background call
      const proto = req.headers['x-forwarded-proto'] || 'https'
      const host = req.headers['x-forwarded-host'] || req.headers.host
      const selfUrl = `${proto}://${host}/api/articles/rewrite`

      // Fire background invocation — don't await
      fetch(selfUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, options, customInstructions, _background: true }),
      }).catch(() => {})

      return res.status(200).json({ success: true, message: 'Rewrite started', articleId: id })
    }

    // Background execution — do the actual rewrite
    // Get language and brand colors from automation if available
    let brandColorInstructions = ''
    let automationLanguage = null
    if (article.automation_id) {
      try {
        const automation = await getAutomation(article.automation_id)
        if (automation?.language) {
          automationLanguage = automation.language
        }
        if (automation?.site_brand_colors) {
          const brandColors = JSON.parse(automation.site_brand_colors)
          if (brandColors?.primary) {
            brandColorInstructions = `\n\nBRAND COLORS: Use these colors for all visual elements (stat blocks, charts, bar charts, tables, highlights):\n- Primary accent: ${brandColors.primary}\n- Secondary: ${brandColors.secondary || brandColors.primary}\n- Text: ${brandColors.text || '#374151'}\nDo NOT use the default indigo (#4f46e5). Use the brand colors above instead.`
          }
        }
      } catch {}
    }

    // Merge automation language into options (options.language takes precedence if explicitly set)
    const mergedOptions = automationLanguage && !options?.language
      ? { ...options, language: automationLanguage }
      : options

    // Rewrite the article using AI
    const rewritten = await rewriteArticle(
      article.title,
      article.originalContent || article.description,
      mergedOptions,
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

    // Remember old slug before updating title
    const oldSlug = (article.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
    const newSlug = (rewritten.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

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

    // If title changed, delete old slug from connected site
    if (oldSlug && newSlug && oldSlug !== newSlug && article.automation_id) {
      try {
        const automation = await getAutomation(article.automation_id)
        if (automation?.site_url && automation?.site_api_key) {
          const origin = new URL(automation.replit_url || automation.site_url).origin
          console.log(`[rewrite] Title changed, deleting old slug "${oldSlug}" from ${origin}`)
          fetch(`${origin}/newspal/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-newspal-key': automation.site_api_key },
            body: JSON.stringify({ slugs: [oldSlug] }),
          }).catch(() => {})
        }
      } catch {}
    }

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