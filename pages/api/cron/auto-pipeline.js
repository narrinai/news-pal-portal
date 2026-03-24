import { fetchAllFeeds } from '../../../lib/rss-parser'
import { createArticle, getArticles, updateArticle, getAutomations } from '../../../lib/airtable'
import { rewriteArticle } from '../../../lib/ai-rewriter'
import { findHeaderImage } from '../../../lib/image-search'
import { discoverFromTags } from '../../../lib/tag-feed-mapping'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Vercel Cron secret in production
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Manual trigger from dashboard bypasses hour/frequency checks
  const force = req.body?.force === true || req.query?.force === 'true'
  // fetchOnly: only fetch and save pipeline candidates, don't auto-schedule or rewrite
  const fetchOnly = req.body?.fetchOnly === true

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
    // Disable built-in keyword filtering — each automation does its own filtering
    const articles = await fetchAllFeeds(true)
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
    const newlyPublishedArticles = []
    for (const article of existingArticles) {
      if (article.status === 'selected' && article.publishedAt) {
        const scheduledDate = new Date(article.publishedAt)
        scheduledDate.setHours(0, 0, 0, 0)
        if (scheduledDate <= today) {
          try {
            await updateArticle(article.id, { status: 'published' })
            newlyPublishedArticles.push(article)
          } catch (err) {
            console.error(`[AUTO-PIPELINE] Failed to publish scheduled article ${article.id}:`, err.message)
          }
        }
      }
    }
    const publishedCount = newlyPublishedArticles.length
    if (publishedCount > 0) {
      console.log(`[AUTO-PIPELINE] Published ${publishedCount} scheduled articles whose date arrived`)
    }

    const automationResults = []

    // Current hour in Europe/Amsterdam timezone
    const currentHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Amsterdam' })
    const nowHour = parseInt(currentHour, 10)

    for (const automation of enabled) {
      // Check if this is the right hour for this automation (skip check if forced)
      if (!force) {
        const pipelineHour = automation.pipeline_hour ?? 7
        if (nowHour !== pipelineHour) {
          console.log(`[AUTO-PIPELINE] Skipping ${automation.name} (pipeline_hour: ${pipelineHour}, current: ${nowHour})`)
          automationResults.push({
            automation_id: automation.id,
            automation_name: automation.name,
            selected: 0,
            rewritten: 0,
            failed: 0,
            message: `Skipped (pipeline_hour: ${pipelineHour}, current hour: ${nowHour})`,
          })
          continue
        }
      }

      if (!force && !shouldRunToday(automation)) {
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

      // Parse tags if available
      let automationTags = []
      try {
        if (automation.tags) automationTags = JSON.parse(automation.tags)
      } catch { /* ignore parse errors */ }

      // Parse target audience
      let targetAudienceStr = ''
      try {
        if (automation.target_audience) {
          const audiences = JSON.parse(automation.target_audience)
          targetAudienceStr = Array.isArray(audiences) ? audiences.join(', ') : ''
        }
      } catch { /* ignore parse errors */ }

      // Determine filtering strategy from tags or legacy categories
      let enabledCategories = []
      let tagKeywords = []
      let tagFeedIds = []
      const isTagBased = automationTags.length > 0

      if (isTagBased) {
        // Tag-based: derive feeds and keywords from tag mappings
        const discovered = discoverFromTags(automationTags)
        enabledCategories = discovered.categories
        tagKeywords = discovered.keywords
        tagFeedIds = discovered.feeds
      } else {
        // Legacy: use categories field directly
        enabledCategories = automation.categories
          ? automation.categories.split(',').map(c => c.trim()).filter(Boolean)
          : []
      }

      // Also include manually selected feeds from the automation
      const manualFeedIds = automation.feeds
        ? automation.feeds.split(',').filter(Boolean)
        : []

      // Step 4: Filter for this automation — dedup only within this automation
      const automationUrls = new Set(
        existingArticles.filter(a => a.automation_id === automation.id).map(a => a.url)
      )
      let newArticles = articles.filter(a => !automationUrls.has(a.url))

      if (isTagBased) {
        // Tag-based: filter by selected feeds AND keyword match
        const allSelectedFeedIds = new Set([...tagFeedIds, ...manualFeedIds])

        // Build a lookup: feed ID → feed name (articles carry source name, not feed ID)
        const { getFeedConfigs, DEFAULT_RSS_FEEDS } = require('../../../lib/feed-manager')
        const allFeedConfigs = await getFeedConfigs()
        // Merge both sources for name lookup
        const feedIdToName = new Map()
        for (const f of [...DEFAULT_RSS_FEEDS, ...allFeedConfigs]) {
          feedIdToName.set(f.id, f.name)
        }
        const selectedFeedNames = new Set()
        for (const id of allSelectedFeedIds) {
          const name = feedIdToName.get(id)
          if (name) selectedFeedNames.add(name)
        }
        console.log(`[AUTO-PIPELINE] [${automation.name}] Selected feed names: ${[...selectedFeedNames].join(', ')}`)

        newArticles = newArticles.filter(a => {
          // Must be from a selected feed
          const fromSelectedFeed = selectedFeedNames.has(a.source)
          if (!fromSelectedFeed) return false

          // Must match at least one keyword (unless keyword filtering is disabled)
          const kwDisabled = (() => { try { return JSON.parse(automation.keywords || '{}')?._disabled } catch { return false } })()
          if (kwDisabled) return true

          const content = ((a.title || '') + ' ' + (a.description || '')).toLowerCase()
          return tagKeywords.some(kw => content.includes(kw.toLowerCase()))
        })
      } else {
        // Legacy: filter by category
        if (enabledCategories.length > 0) {
          newArticles = newArticles.filter(a => enabledCategories.includes(a.category))
        }
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

      // Pipeline candidates: fetch more articles (up to 10) for the user to choose from
      const pipelineSize = Math.max(30, maxArticles * 5)
      const allCandidates = ranked.slice(0, pipelineSize)
      console.log(`[AUTO-PIPELINE] [${automation.name}] ${ranked.length} total after ranking, taking ${allCandidates.length} candidates (pipeline size ${pipelineSize})`)
      // Auto-schedule: only if automation has auto_schedule enabled and not fetchOnly
      const shouldAutoSchedule = !fetchOnly && (automation.auto_schedule === true)
      const toAutoSchedule = shouldAutoSchedule ? allCandidates.slice(0, maxArticles) : []
      // The rest are saved as pending (pipeline candidates)
      const toPending = shouldAutoSchedule ? allCandidates.slice(maxArticles) : allCandidates

      console.log(`[AUTO-PIPELINE] [${automation.name}] ${allCandidates.length} candidates: ${toAutoSchedule.length} to auto-schedule, ${toPending.length} as pending`)

      // Save pending candidates first (no AI rewrite, fast)
      for (const article of toPending) {
        try {
          await createArticle({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source,
            publishedAt: new Date().toISOString(),
            status: 'pending',
            category: article.category,
            originalContent: article.originalContent || '',
            imageUrl: article.imageUrl || '',
            matchedKeywords: article.matchedKeywords || [],
            automation_id: automation.id,
          })
          existingUrls.add(article.url)
        } catch (err) {
          console.error(`[AUTO-PIPELINE] [${automation.name}] Failed to save pending: ${article.title}:`, err.message)
        }
      }

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

      for (const article of toAutoSchedule) {
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

          // Build custom instructions from extra_context + ai_settings
          let customInstructions = automation.extra_context || ''
          let aiSettings = {}
          try { if (automation.ai_settings) aiSettings = JSON.parse(automation.ai_settings) } catch {}

          const instructions = []
          if (customInstructions) instructions.push(customInstructions)

          // Feature toggles
          if (aiSettings.include_faq === false) instructions.push('Do NOT include a FAQ section.')
          if (aiSettings.include_images === false) instructions.push('Do NOT include inline images.')
          if (aiSettings.include_charts === false) instructions.push('Do NOT include charts or data tables.')
          if (aiSettings.include_sources === false) instructions.push('Do NOT include a sources section.')
          if (aiSettings.include_quotes === false) instructions.push('Do NOT include generated quotes.')

          // Internal linking strategy
          if (aiSettings.internal_links) instructions.push(`INTERNAL LINKING:\n${aiSettings.internal_links}`)

          // URL rules
          if (aiSettings.url_rules && aiSettings.url_rules.length > 0) {
            const rules = aiSettings.url_rules.map(r =>
              `- When mentioning "${r.keyword}", link it to ${r.url}${r.label ? ` with anchor text "${r.label}"` : ''}`
            ).join('\n')
            instructions.push(`KEYWORD LINKS (always apply these):\n${rules}`)
          }

          const fullInstructions = instructions.join('\n\n') || undefined

          const rewritten = await rewriteArticle(
            article.title,
            article.originalContent || article.description,
            {
              style: automation.style || 'news',
              length: automation.length || 'medium',
              language: automation.language || 'nl',
              tone: 'informative',
              targetAudience: targetAudienceStr || undefined,
            },
            fullInstructions,
            article.url
          )

          // Find header image if missing (skip if disabled in ai_settings)
          let headerImage = article.imageUrl
          if (!headerImage && aiSettings.include_header_image !== false) {
            try {
              headerImage = await findHeaderImage(rewritten.title, article.matchedKeywords)
            } catch { /* silent */ }
          }

          const cleanTopic = rewritten.category ? rewritten.category.replace(/^["']+|["']+$/g, '').trim() : null
          await updateArticle(articleId, {
            title: rewritten.title,
            content_rewritten: rewritten.content,
            content_html: rewritten.content_html,
            subtitle: rewritten.subtitle || '',
            faq: (Array.isArray(rewritten.faq) && rewritten.faq.length > 0) ? JSON.stringify(rewritten.faq) : '',
            ...(headerImage ? { imageUrl: headerImage } : {}),
            ...(cleanTopic ? { topic: cleanTopic } : {}),
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
        selected: toAutoSchedule.length,
        rewritten: successful,
        failed,
        pending: toPending.length,
        articles: results,
      })
    }

    const totalRewritten = automationResults.reduce((sum, r) => sum + r.rewritten, 0)
    const totalFailed = automationResults.reduce((sum, r) => sum + r.failed, 0)

    // Push only newly published articles to Replit sites (no duplicates)
    const newlyPublishedByAutomation = {}
    for (const article of newlyPublishedArticles) {
      if (!article.automation_id) continue
      if (!newlyPublishedByAutomation[article.automation_id]) newlyPublishedByAutomation[article.automation_id] = []
      newlyPublishedByAutomation[article.automation_id].push(article)
    }

    const pushResults = []
    for (const automation of enabled) {
      const toPush = newlyPublishedByAutomation[automation.id]
      if (!toPush || toPush.length === 0) continue
      if (automation.site_platform !== 'replit' || !automation.site_api_key || !automation.site_url) continue

      try {
        const publishedArticles = toPush.map(a => ({
          id: a.id,
          slug: (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
          title: a.title,
          description: (a.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim() + ((a.description || '').length > 200 ? '...' : ''),
          content_html: a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`,
          category: a.topic || a.category,
          source: a.source,
          sourceUrl: a.url,
          imageUrl: a.imageUrl || `https://placehold.co/1200x630/4f46e5/ffffff?text=${encodeURIComponent((a.title || 'Article').substring(0, 30))}`,
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
          pushed: publishedArticles.length,
          status: pushRes.status,
          received: pushData.received || 0,
          total: pushData.total || 0,
        })
        console.log(`[AUTO-PIPELINE] Pushed ${pushData.received || 0} new articles to ${automation.name}: ${pushRes.status}`)
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
