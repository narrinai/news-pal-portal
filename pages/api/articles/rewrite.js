import { updateArticle, getArticles, getAutomation } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'

// The actual rewrite logic — called directly for _background=true requests
async function doRewrite(id, options, customInstructions) {
  const articles = await getArticles()
  const article = articles.find(a => a.id === id)

  if (!article) {
    throw new Error(`Article ${id} not found`)
  }

  let extraInstructions = ''
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
          extraInstructions += `\n\nBRAND COLORS: Use these colors for all visual elements (stat blocks, charts, bar charts, tables, highlights):\n- Primary accent: ${brandColors.primary}\n- Secondary: ${brandColors.secondary || brandColors.primary}\n- Text: ${brandColors.text || '#374151'}\nDo NOT use the default indigo (#4f46e5). Use the brand colors above instead.`
        }
      }
      const seoContext = []
      if (automation?.site_name) seoContext.push(`Website: ${automation.site_name}`)
      if (automation?.site_url) seoContext.push(`URL: ${automation.site_url}`)
      if (automation?.keywords) seoContext.push(`Site niche keywords: ${automation.keywords}`)
      if (automation?.tags) seoContext.push(`Content tags/topics: ${automation.tags}`)
      if (seoContext.length > 0) {
        extraInstructions += `\n\nSEO CONTEXT — Choose focus keywords and SEO keywords that are relevant for this website and its audience:\n${seoContext.join('\n')}\nThe focus keyword should match what this site's target audience would search for. Combine the article topic with the site's niche to find the best keyword angle.`
      }
    } catch {}
  }

  // Merge automation language into options (options.language takes precedence if explicitly set)
  const mergedOptions = automationLanguage && !options?.language
    ? { ...options, language: automationLanguage }
    : options

  console.log(`[rewrite] Starting AI rewrite for "${article.title?.substring(0, 50)}" in language: ${mergedOptions?.language || 'nl'}`)

  const rewritten = await rewriteArticle(
    article.title,
    article.originalContent || article.description,
    mergedOptions,
    (customInstructions || '') + extraInstructions || undefined,
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
    ...(rewritten.focus_keyword ? { focus_keyword: rewritten.focus_keyword } : {}),
    ...(rewritten.meta_description ? { meta_description: rewritten.meta_description } : {}),
    ...(rewritten.seo_keywords?.length ? { seo_keywords: rewritten.seo_keywords.join(', ') } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(cleanTopic ? { topic: cleanTopic } : {}),
    status: (article.status === 'published' || article.status === 'selected') ? article.status : 'rewritten'
  })

  console.log(`[rewrite] ✅ Done: "${rewritten.title?.substring(0, 50)}" (lang: ${mergedOptions?.language || 'nl'})`)

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

  return rewritten
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, options, customInstructions, _background } = req.body;

    console.log('Rewrite request:', { id, options, _background, hasCustomInstructions: !!customInstructions })

    // Background call: do the actual work
    if (_background) {
      try {
        const rewritten = await doRewrite(id, options, customInstructions)
        return res.status(200).json({
          success: true,
          rewritten: {
            title: rewritten.title,
            subtitle: rewritten.subtitle,
            content: rewritten.content,
            content_html: rewritten.content_html,
            faq: rewritten.faq,
            focus_keyword: rewritten.focus_keyword,
            meta_description: rewritten.meta_description,
            seo_keywords: rewritten.seo_keywords
          }
        })
      } catch (error) {
        console.error('[rewrite] Background rewrite failed:', error)
        return res.status(500).json({ error: 'Rewrite failed', details: error.message })
      }
    }

    // Foreground call: verify article exists, then dispatch background work
    const articles = await getArticles()
    const article = articles.find(a => a.id === id)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Build self-URL — prefer req.headers.host (works correctly in both dev and prod)
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const host = req.headers.host || 'localhost:3000'
    const selfUrl = `${proto}://${host}/api/articles/rewrite`

    console.log(`[rewrite] Dispatching background call to: ${selfUrl}`)
    fetch(selfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, options, customInstructions, _background: true }),
    }).catch((err) => console.error('[rewrite] Background dispatch failed:', err.message))

    return res.status(200).json({ success: true, message: 'Rewrite started', articleId: id })
  } catch (error) {
    console.error('Error in rewrite handler:', error)
    return res.status(500).json({ error: 'Failed to start rewrite', details: error.message })
  }
}
