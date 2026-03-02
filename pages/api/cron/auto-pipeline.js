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

    // Step 2: Fetch articles from RSS feeds (once, shared across automations)
    const articles = await fetchAllFeeds()
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

      // Step 4: Filter for this automation
      let newArticles = articles.filter(a => !existingUrls.has(a.url))

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

      const results = []

      for (const article of toProcess) {
        try {
          const created = await createArticle({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt,
            status: 'selected',
            category: article.category,
            originalContent: article.originalContent || '',
            imageUrl: article.imageUrl || '',
            matchedKeywords: article.matchedKeywords || [],
            automation_id: automation.id,
          })

          const articleId = created.id

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
            status: 'published',
          })

          // Add to existingUrls so other automations don't duplicate
          existingUrls.add(article.url)

          console.log(`[AUTO-PIPELINE] [${automation.name}] Published: ${rewritten.title}`)
          results.push({ originalTitle: article.title, rewrittenTitle: rewritten.title, status: 'published' })
        } catch (error) {
          console.error(`[AUTO-PIPELINE] [${automation.name}] Error: ${article.title}:`, error)
          results.push({ originalTitle: article.title, status: 'error', error: error.message })
        }
      }

      const successful = results.filter(r => r.status === 'published').length
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

    // Trigger deploy webhooks only for automations that published new articles
    const webhookResults = []
    for (const automation of enabled) {
      if (automation.deploy_webhook_url) {
        const result = automationResults.find(r => r.automation_id === automation.id)
        const newArticles = result?.rewritten || 0
        if (newArticles === 0) {
          console.log(`[AUTO-PIPELINE] Skipping webhook for ${automation.name} (no new articles)`)
          continue
        }
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
