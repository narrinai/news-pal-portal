import { getAutomation, getArticles, updateArticle } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'
import { scrapeArticleContent } from '../../../lib/article-scraper'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, article_ids } = req.body
  console.log(`[push-articles] Called — automation_id: ${automation_id}, article_ids: ${JSON.stringify(article_ids)}`)

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  try {
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    if (!automation.site_url || !automation.site_api_key) {
      return res.status(200).json({ success: false, error: 'No site URL or API key configured' })
    }
    // WordPress and HubSpot use their own publish APIs — not this push mechanism
    if (automation.site_platform === 'wordpress' || automation.site_platform === 'hubspot') {
      return res.status(200).json({ success: false, error: 'Use the WordPress/HubSpot publish flow instead' })
    }

    // Get articles — optionally filtered to specific IDs
    const allArticles = await getArticles()
    const idsFilter = article_ids && Array.isArray(article_ids) ? new Set(article_ids) : null

    const hasRealContent = a => !!(a.content_html && a.content_html.trim()) || !!(a.content_rewritten && a.content_rewritten.trim())
    const hasRealImage = a => !!(a.imageUrl && !a.imageUrl.includes('placehold.co'))

    // Auto-rewrite articles that have no real content yet
    const toRewrite = allArticles.filter(a => {
      if (idsFilter && !idsFilter.has(a.id)) return false
      if (!idsFilter && (a.automation_id !== automation_id || a.status === 'pending')) return false
      return !hasRealContent(a)
    })
    for (const a of toRewrite) {
      try {
        console.log(`[push-articles] Auto-rewriting: ${a.title?.substring(0, 50)}`)
        // Scrape full article content if RSS snippet is too short
        let sourceContent = a.originalContent || a.description || ''
        if (sourceContent.replace(/<[^>]+>/g, '').length < 300 && a.url) {
          try {
            const scraped = await scrapeArticleContent(a.url)
            if (scraped.length > sourceContent.replace(/<[^>]+>/g, '').length) {
              sourceContent = scraped
              console.log(`[push-articles] Scraped full content for: ${a.title?.substring(0, 50)} (${scraped.length} chars)`)
            }
          } catch {}
        }
        // Build SEO context for keyword relevance
        const seoContext = []
        if (automation.site_name) seoContext.push(`Website: ${automation.site_name}`)
        if (automation.site_url) seoContext.push(`URL: ${automation.site_url}`)
        if (automation.keywords) seoContext.push(`Site niche keywords: ${automation.keywords}`)
        if (automation.tags) seoContext.push(`Content tags/topics: ${automation.tags}`)
        const seoInstructions = seoContext.length > 0
          ? `SEO CONTEXT — Choose focus keywords and SEO keywords that are relevant for this website and its audience:\n${seoContext.join('\n')}\nThe focus keyword should match what this site's target audience would search for. Combine the article topic with the site's niche to find the best keyword angle.`
          : undefined
        const allInstructions = [automation.extra_context, seoInstructions].filter(Boolean).join('\n\n') || undefined
        const rewritten = await rewriteArticle(
          a.title,
          sourceContent,
          { style: automation.style || 'news', length: automation.length || 'medium', language: automation.language || 'nl', tone: 'informative' },
          allInstructions,
          a.url
        )
        let imageUrl = hasRealImage(a) ? a.imageUrl : null
        if (!imageUrl) {
          try { imageUrl = await findHeaderImage(rewritten.title, a.matchedKeywords) } catch {}
        }
        const cleanTopic = rewritten.category?.replace(/^["']+|["']+$/g, '').trim() || null
        await updateArticle(a.id, {
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
          status: a.status === 'pending' ? 'rewritten' : a.status,
        })
        a.content_html = rewritten.content_html
        a.content_rewritten = rewritten.content
        a.title = rewritten.title
        a.subtitle = rewritten.subtitle || ''
        a.faq = rewritten.faq ? JSON.stringify(rewritten.faq) : ''
        a.topic = cleanTopic
        if (imageUrl) a.imageUrl = imageUrl
        console.log(`[push-articles] Auto-rewrite done: ${a.title?.substring(0, 50)}`)
      } catch (err) {
        console.error(`[push-articles] Auto-rewrite failed for ${a.title?.substring(0, 50)}:`, err.message)
      }
    }

    // For articles that already have content but no real image, search for one (no rewrite)
    const toFindImage = allArticles.filter(a => {
      if (idsFilter && !idsFilter.has(a.id)) return false
      if (!idsFilter && (a.automation_id !== automation_id || a.status === 'pending')) return false
      return hasRealContent(a) && !hasRealImage(a)
    })
    for (const a of toFindImage) {
      try {
        console.log(`[push-articles] Finding image for: ${a.title?.substring(0, 50)}`)
        const imageUrl = await findHeaderImage(a.title, a.matchedKeywords)
        if (imageUrl && !imageUrl.includes('placehold.co')) {
          await updateArticle(a.id, { imageUrl })
          a.imageUrl = imageUrl
          console.log(`[push-articles] Image found: ${imageUrl.substring(0, 80)}`)
        }
      } catch (err) {
        console.error(`[push-articles] Image search failed for ${a.title?.substring(0, 50)}:`, err.message)
      }
    }
    // Derive site category from the site_url path segment
    // e.g. https://repricing.de/news/retail → "Retail"
    // This ensures pushed articles appear under the correct section on the site
    const siteUrlPath = (() => { try { return new URL(automation.site_url).pathname } catch { return '' } })()
    const lastSegment = siteUrlPath.split('/').filter(Boolean).pop()
    const primaryCategory = lastSegment
      ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
      : (automation.categories ? automation.categories.split(',')[0].trim() : undefined)
    const publishedArticles = allArticles
      .filter(a => {
        if (idsFilter) {
          // Specific article push: match by ID only — automation_id may be unset on older articles
          return idsFilter.has(a.id)
        }
        // Full sync: require both automation_id match and published status
        return a.automation_id === automation_id && a.status === 'published'
      })
      .filter(a => {
        // Skip articles that were never rewritten — pushing original English content is wrong
        if (!hasRealContent(a)) {
          console.warn(`[push-articles] Skipping article without rewritten content: ${a.title?.substring(0, 60)}`)
          return false
        }
        return true
      })
      .map(a => ({
        id: a.id,
        slug: (a.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
        title: a.title,
        // Prefer rewritten subtitle (in target language) over original description (often English)
        description: (() => {
          const text = a.subtitle || a.description || ''
          const clean = text.replace(/<[^>]+>/g, '').trim()
          return clean.length > 200 ? clean.substring(0, 200).trim() + '...' : clean
        })(),
        content_html: a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`,
        category: primaryCategory || a.topic || a.category,
        source: a.source,
        sourceUrl: a.url,
        imageUrl: a.imageUrl || `https://placehold.co/1200x630/4f46e5/ffffff?text=${encodeURIComponent((a.title || 'Article').substring(0, 30))}`,
        subtitle: a.subtitle || '',
        publishedAt: a.publishedAt,
        faq: a.faq || null,
      }))

    if (publishedArticles.length === 0) {
      return res.status(200).json({ success: true, pushed: 0, message: 'No published articles to push' })
    }

    const targetUrl = automation.replit_url || automation.site_url
    const origin = new URL(targetUrl).origin
    const pushUrl = `${origin}/newspal/receive`
    console.log(`[push-articles] Pushing ${publishedArticles.length} article(s) to ${pushUrl} with key ${automation.site_api_key?.slice(0, 10)}...`)

    // Push in batches of 3 to avoid 413 Payload Too Large
    const BATCH_SIZE = 3
    let totalReceived = 0
    let totalOnSite = 0

    for (let i = 0; i < publishedArticles.length; i += BATCH_SIZE) {
      const batch = publishedArticles.slice(i, i + BATCH_SIZE)
      const pushRes = await fetch(pushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-newspal-key': automation.site_api_key,
        },
        body: JSON.stringify({ articles: batch }),
      })

      const data = await pushRes.json().catch(() => ({}))
      console.log(`[push-articles] Response: ${pushRes.status}`, JSON.stringify(data).slice(0, 200))

      if (!pushRes.ok) {
        console.error(`[push-articles] Batch ${i / BATCH_SIZE + 1} failed: ${pushRes.status}`)
        return res.status(200).json({
          success: false,
          error: `Site returned ${pushRes.status} on batch ${Math.floor(i / BATCH_SIZE) + 1}`,
          pushed: totalReceived,
        })
      }

      totalReceived += data.received ?? batch.length
      totalOnSite = data.total || totalOnSite
    }

    return res.status(200).json({
      success: true,
      pushed: totalReceived,
      total: totalOnSite,
    })
  } catch (error) {
    console.error('[push-articles] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: error.message,
    })
  }
}
