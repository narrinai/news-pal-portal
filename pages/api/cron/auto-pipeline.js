import { fetchAllFeeds } from '../../../lib/rss-parser'
import { createArticle, getArticles, updateArticle, getAutomations } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Vercel Cron secret in production
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Step 1: Get all enabled automations
    const automations = await getAutomations()
    const enabled = automations.filter(a => a.enabled)

    console.log(`[AUTO-PIPELINE] Found ${automations.length} automations, ${enabled.length} enabled`)

    if (enabled.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No enabled automations',
        automations: [],
      })
    }

    // Step 2: Fetch articles from RSS feeds
    // Fetch unfiltered version if any automation has keywords disabled
    const hasKeywordsDisabled = enabled.some(a => {
      try { return JSON.parse(a.keywords || '{}')._enabled === false } catch { return false }
    })
    const articles = await fetchAllFeeds(false)
    const allArticlesUnfiltered = hasKeywordsDisabled ? await fetchAllFeeds(true) : null
    console.log(`[AUTO-PIPELINE] Fetched ${articles.length} articles from RSS feeds`)

    // Step 3: Get existing articles to avoid duplicates
    const existingArticles = await getArticles()
    const existingUrls = new Set(existingArticles.map(a => a.url))

    // Frequency check: determine which automations should run today
    function shouldRunToday(automation) {
      const freq = automation.publish_frequency || 'daily'
      if (freq === 'daily') return true

      const today = new Date()
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
      const dayOfWeek = today.getDay() // 0=Sun
      const dayOfMonth = today.getDate()

      switch (freq) {
        case 'every-2-days': return dayOfYear % 2 === 0
        case 'every-3-days': return dayOfYear % 3 === 0
        case 'weekly':       return dayOfWeek === 1 // Monday
        case 'biweekly':     return dayOfWeek === 1 && Math.floor(dayOfYear / 7) % 2 === 0
        case 'monthly':      return dayOfMonth === 1
        default:             return true
      }
    }

    // Step 3b: Publish scheduled articles whose date has arrived
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let publishedCount = 0
    for (const article of existingArticles) {
      if (article.status === 'selected' && article.publishedAt) {
        const scheduledDate = new Date(article.publishedAt)
        scheduledDate.setHours(0, 0, 0, 0)
        if (scheduledDate <= today) {
          try {
            await updateArticle(article.id, { status: 'published' })
            publishedCount++
          } catch (err) {
            console.error(`[AUTO-PIPELINE] Failed to publish scheduled article ${article.id}:`, err.message)
          }
        }
      }
    }
    if (publishedCount > 0) {
      console.log(`[AUTO-PIPELINE] Published ${publishedCount} scheduled articles whose date arrived`)
    }

    const automationResults = []

    for (const automation of enabled) {
      if (!shouldRunToday(automation)) {
        console.log(`[AUTO-PIPELINE] Skipping ${automation.name} (frequency: ${automation.publish_frequency || 'daily'}, not scheduled today)`)
        automationResults.push({
          automation_id: automation.id,
          automation_name: automation.name,
          selected: 0,
          rewritten: 0,
          failed: 0,
          message: `Skipped (frequency: ${automation.publish_frequency || 'daily'})`,
        })
        continue
      }

      console.log(`[AUTO-PIPELINE] Processing automation: ${automation.name} (${automation.id})`)

      const maxArticles = automation.articles_per_day || 2
      const enabledCategories = automation.categories
        ? automation.categories.split(',').map(c => c.trim()).filter(Boolean)
        : []

      // Use unfiltered articles if keywords are disabled for this automation
      const keywordsEnabled = (() => {
        try { return JSON.parse(automation.keywords || '{}')._enabled !== false } catch { return true }
      })()
      const sourceArticles = (!keywordsEnabled && allArticlesUnfiltered) ? allArticlesUnfiltered : articles

      // Step 4: Filter for this automation
      let newArticles = sourceArticles.filter(a => !existingUrls.has(a.url))

      if (enabledCategories.length > 0) {
        newArticles = newArticles.filter(a => enabledCategories.includes(a.category))
      }

      console.log(`[AUTO-PIPELINE] [${automation.name}] ${newArticles.length} new articles after filter`)

      if (newArticles.length === 0) {
        automationResults.push({
          automation_id: automation.id,
          automation_name: automation.name,
          selected: 0,
          rewritten: 0,
          failed: 0,
          message: 'No new articles to process',
        })
        continue
      }

      // Step 5: Rank by keyword count
      const ranked = newArticles
        .map(a => ({ ...a, keywordCount: a.matchedKeywords ? a.matchedKeywords.length : 0 }))
        .sort((a, b) => b.keywordCount - a.keywordCount)

      const toProcess = ranked.slice(0, maxArticles)
      console.log(`[AUTO-PIPELINE] [${automation.name}] Selected ${toProcess.length} articles`)

      // Calculate scheduled dates: one article per day starting tomorrow
      const existingScheduled = existingArticles
        .filter(a => a.automation_id === automation.id && a.status === 'selected' && a.publishedAt)
        .map(a => new Date(a.publishedAt).toISOString().split('T')[0])
      const scheduledDatesSet = new Set(existingScheduled)

      function getNextAvailableDate(startFrom) {
        const d = new Date(startFrom)
        d.setHours(7, 0, 0, 0)
        while (scheduledDatesSet.has(d.toISOString().split('T')[0])) {
          d.setDate(d.getDate() + 1)
        }
        scheduledDatesSet.add(d.toISOString().split('T')[0])
        return d
      }

      let nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 1) // start from tomorrow

      const results = []

      for (const article of toProcess) {
        let articleId = null
        try {
          const scheduledDate = getNextAvailableDate(nextDate)
          nextDate = new Date(scheduledDate)
          nextDate.setDate(nextDate.getDate() + 1)

          const created = await createArticle({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source,
            publishedAt: scheduledDate.toISOString(),
            status: 'selected',
            category: article.category,
            originalContent: article.originalContent || '',
            imageUrl: article.imageUrl || '',
            matchedKeywords: article.matchedKeywords || [],
            automation_id: automation.id,
          })

          articleId = created.id

          const rewritten = await rewriteArticle(
            article.title,
            article.originalContent || article.description,
            {
              style: automation.style || 'news',
              length: automation.length || 'medium',
              language: automation.language || 'nl',
              tone: 'informative',
            },
            undefined,
            article.url
          )

          await updateArticle(articleId, {
            title: rewritten.title,
            content_rewritten: rewritten.content,
            content_html: rewritten.content_html,
            subtitle: rewritten.subtitle || '',
            faq: (Array.isArray(rewritten.faq) && rewritten.faq.length > 0) ? JSON.stringify(rewritten.faq) : '',
            status: 'selected',
          })

          // Add to existingUrls so other automations don't duplicate
          existingUrls.add(article.url)

          console.log(`[AUTO-PIPELINE] [${automation.name}] Scheduled: ${rewritten.title} for ${scheduledDate.toISOString().split('T')[0]}`)
          results.push({ originalTitle: article.title, rewrittenTitle: rewritten.title, status: 'scheduled', scheduledFor: scheduledDate.toISOString().split('T')[0] })
        } catch (error) {
          console.error(`[AUTO-PIPELINE] [${automation.name}] Error: ${article.title}:`, error)
          // Clean up: delete the article if rewrite failed (e.g. AI refusal)
          if (articleId) {
            try {
              const { deleteArticle } = require('../../../lib/airtable')
              await deleteArticle(articleId)
              console.log(`[AUTO-PIPELINE] [${automation.name}] Cleaned up failed article: ${article.title}`)
            } catch (cleanupErr) {
              console.error(`[AUTO-PIPELINE] Cleanup failed for ${articleId}:`, cleanupErr)
            }
          }
          results.push({ originalTitle: article.title, status: 'error', error: error.message })
        }
      }

      const successful = results.filter(r => r.status === 'scheduled').length
      const failed = results.filter(r => r.status === 'error').length

      automationResults.push({
        automation_id: automation.id,
        automation_name: automation.name,
        selected: toProcess.length,
        rewritten: successful,
        failed,
        articles: results,
      })
    }

    const totalRewritten = automationResults.reduce((sum, r) => sum + r.rewritten, 0)
    const totalFailed = automationResults.reduce((sum, r) => sum + r.failed, 0)

    // Push articles to Replit sites (push model)
    const pushResults = []
    for (const automation of enabled) {
      if (automation.site_platform === 'replit' && automation.site_api_key && automation.site_url) {
        // Push if there are any published articles (either newly published scheduled ones or existing)


        try {
          // Re-fetch articles to include newly published ones from this pipeline run
          const latestArticles = await getArticles()
          const allArticles = latestArticles.filter(a => a.automation_id === automation.id)
          const publishedArticles = allArticles
            .filter(a => a.status === 'published')
            .map(a => ({
              id: a.id,
              slug: (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
              title: a.title,
              description: a.description,
              content_html: a.content_html || a.content_rewritten || '',
              category: a.category,
              source: a.source,
              sourceUrl: a.url,
              imageUrl: a.imageUrl || '',
              subtitle: a.subtitle || '',
              publishedAt: a.publishedAt,
              faq: a.faq || null,
            }))

          const targetUrl = automation.replit_url || automation.site_url
          const origin = new URL(targetUrl).origin
          const pushUrl = `${origin}/newspal/receive`

          const pushRes = await fetch(pushUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-newspal-key': automation.site_api_key,
              'X-Requested-With': 'XMLHttpRequest',
              'Origin': origin,
            },
            body: JSON.stringify({ articles: publishedArticles }),
          })

          const pushData = await pushRes.json().catch(() => ({}))
          pushResults.push({
            automation_id: automation.id,
            automation_name: automation.name,
            pushed: true,
            status: pushRes.status,
            received: pushData.received || 0,
            total: pushData.total || 0,
          })
          console.log(`[AUTO-PIPELINE] Pushed ${pushData.received || 0} articles to ${automation.name} Replit site: ${pushRes.status}`)
        } catch (pushError) {
          pushResults.push({
            automation_id: automation.id,
            automation_name: automation.name,
            pushed: false,
            error: pushError.message,
          })
          console.error(`[AUTO-PIPELINE] Push failed for ${automation.name}:`, pushError.message)
        }
      }
    }

    // Trigger deploy webhooks when articles were published (scheduled articles whose date arrived)
    const webhookResults = []
    for (const automation of enabled) {
      if (automation.deploy_webhook_url && publishedCount > 0) {
        try {
          const webhookRes = await fetch(automation.deploy_webhook_url, { method: 'POST' })
          webhookResults.push({
            automation_id: automation.id,
            automation_name: automation.name,
            webhook_status: webhookRes.status,
            triggered: true,
            new_articles: newArticles,
          })
          console.log(`[AUTO-PIPELINE] Triggered deploy webhook for ${automation.name} (${newArticles} new articles): ${webhookRes.status}`)
        } catch (webhookError) {
          webhookResults.push({
            automation_id: automation.id,
            automation_name: automation.name,
            triggered: false,
            error: webhookError.message,
          })
          console.error(`[AUTO-PIPELINE] Webhook failed for ${automation.name}:`, webhookError.message)
        }
      }
    }

    const summary = {
      success: true,
      message: `Auto-pipeline completed: ${totalRewritten} published, ${totalFailed} failed across ${enabled.length} automations`,
      automations: automationResults,
      pushes: pushResults.length > 0 ? pushResults : undefined,
      webhooks: webhookResults.length > 0 ? webhookResults : undefined,
      timestamp: new Date().toISOString(),
    }

    console.log('[AUTO-PIPELINE] Completed:', summary.message)
    return res.status(200).json(summary)
  } catch (error) {
    console.error('[AUTO-PIPELINE] Fatal error:', error)
    return res.status(500).json({
      error: 'Auto-pipeline failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
