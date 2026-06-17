const { fetchAllFeeds } = require('./rss-parser')
const { createArticle, createArticlesBatch, getArticles, updateArticle, getAutomations, deleteArticle } = require('./airtable')
const { rewriteArticle } = require('./ai-rewriter')
const { findHeaderImage } = require('./image-search')
const { discoverFromTags } = require('./tag-feed-mapping')
const { scrapeArticleContent } = require('./article-scraper')
const { getFeedConfigs, DEFAULT_RSS_FEEDS } = require('./feed-manager')
const { buildArticlePayload, pushArticlesToSite } = require('./pushToSite')

async function runAutoPipeline({ force = false, fetchOnly = false, singleAutomationId = null } = {}) {
  const automations = await getAutomations()
  let enabled = automations.filter(a => a.enabled)
  if (singleAutomationId) {
    enabled = enabled.filter(a => a.id === singleAutomationId)
  }

  console.log(`[AUTO-PIPELINE] Found ${automations.length} automations, ${enabled.length} enabled`)

  if (enabled.length === 0) {
    return { success: true, message: 'No enabled automations', automations: [] }
  }

  let feedIdFilter = null
  if (singleAutomationId) {
    const auto = enabled[0]
    if (auto) {
      const autoTags = (() => { try { return JSON.parse(auto.tags || '[]') } catch { return [] } })()
      const discovered = autoTags.length > 0 ? discoverFromTags(autoTags) : { feeds: [] }
      const manualFeeds = auto.feeds ? auto.feeds.split(',').filter(Boolean) : []
      const allFeedIds = [...new Set([...discovered.feeds, ...manualFeeds])]
      if (allFeedIds.length > 0) {
        feedIdFilter = new Set(allFeedIds)
        console.log(`[AUTO-PIPELINE] Filtering to ${feedIdFilter.size} feeds for automation ${auto.name}`)
      }
    }
  }
  const articles = await fetchAllFeeds(true, undefined, feedIdFilter)
  console.log(`[AUTO-PIPELINE] Fetched ${articles.length} articles from RSS feeds`)

  const existingArticles = await getArticles()
  const existingUrls = new Set(existingArticles.map(a => a.url))

  function shouldRunToday(automation) {
    const freq = automation.publish_frequency || 'daily'
    if (freq === 'daily') return true

    const today = new Date()
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const dayOfWeek = today.getDay()
    const dayOfMonth = today.getDate()

    switch (freq) {
      case 'every-2-days': return dayOfYear % 2 === 0
      case 'every-3-days': return dayOfYear % 3 === 0
      case 'weekly':       return dayOfWeek === 1
      case 'biweekly':     return dayOfWeek === 1 && Math.floor(dayOfYear / 7) % 2 === 0
      case 'monthly':      return dayOfMonth === 1
      default:             return true
    }
  }

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

  const currentHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Amsterdam' })
  const nowHour = parseInt(currentHour, 10)

  // Cache feed lookups once per run (was previously re-fetched per automation)
  let cachedFeedIdToName = null
  async function getFeedIdToName() {
    if (cachedFeedIdToName) return cachedFeedIdToName
    const allFeedConfigs = await getFeedConfigs()
    const map = new Map()
    for (const f of [...DEFAULT_RSS_FEEDS, ...allFeedConfigs]) {
      map.set(f.id, f.name)
    }
    cachedFeedIdToName = map
    return map
  }

  for (const automation of enabled) {
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

    let automationTags = []
    try {
      if (automation.tags) automationTags = JSON.parse(automation.tags)
    } catch {}

    let targetAudienceStr = ''
    try {
      if (automation.target_audience) {
        const audiences = JSON.parse(automation.target_audience)
        targetAudienceStr = Array.isArray(audiences) ? audiences.join(', ') : ''
      }
    } catch {}

    let enabledCategories = []
    let tagKeywords = []
    let tagFeedIds = []
    const isTagBased = automationTags.length > 0

    if (isTagBased) {
      const discovered = discoverFromTags(automationTags)
      enabledCategories = discovered.categories
      tagKeywords = discovered.keywords
      tagFeedIds = discovered.feeds
    } else {
      enabledCategories = automation.categories
        ? automation.categories.split(',').map(c => c.trim()).filter(Boolean)
        : []
    }

    const manualFeedIds = automation.feeds
      ? automation.feeds.split(',').filter(Boolean)
      : []

    const automationUrls = new Set(
      existingArticles.filter(a => a.automation_id === automation.id).map(a => a.url)
    )
    let newArticles = articles.filter(a => !automationUrls.has(a.url))

    if (isTagBased) {
      const allSelectedFeedIds = new Set([...tagFeedIds, ...manualFeedIds])
      const feedIdToName = await getFeedIdToName()
      const selectedFeedNames = new Set()
      for (const id of allSelectedFeedIds) {
        const name = feedIdToName.get(id)
        if (name) selectedFeedNames.add(name)
      }
      console.log(`[AUTO-PIPELINE] [${automation.name}] Selected feed names: ${[...selectedFeedNames].join(', ')}`)

      newArticles = newArticles.filter(a => {
        const fromSelectedFeed = selectedFeedNames.has(a.source)
        if (!fromSelectedFeed) return false

        const kwDisabled = (() => { try { return JSON.parse(automation.keywords || '{}')?._disabled } catch { return false } })()
        if (kwDisabled) return true

        const content = ((a.title || '') + ' ' + (a.description || '')).toLowerCase()
        return tagKeywords.some(kw => content.includes(kw.toLowerCase()))
      })
    } else {
      // Restrict to the automation's OWN selected feeds (feed name === article.source).
      // Without this, a category automation with no category (e.g. a single-feed site)
      // got assigned every article from every feed — e.g. tech/cyber news on a football site.
      if (manualFeedIds.length > 0) {
        const feedIdToName = await getFeedIdToName()
        const selectedFeedNames = new Set(
          manualFeedIds.map(id => feedIdToName.get(id)).filter(Boolean)
        )
        newArticles = newArticles.filter(a => selectedFeedNames.has(a.source))
      }
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

    // instant_publish (a fast-moving news site): publish the FRESHEST article(s) right away,
    // paced toward articles_per_day across the day, instead of scheduling a batch for future
    // days. Driven by the hourly cron → ~1 fresh article per run, published with publishedAt=now
    // so the auto-publish cron pushes it to the site within the hour.
    const instantPublish = automation.instant_publish === true

    // Instant-mode selection strategy (per-automation `prioritize_recency`):
    //  - recency-first: the MOST RECENT article that fits the site (relevance breaks ties)
    //  - relevance-first (default): the BEST match for the site that isn't too old (≤3 days;
    //    if nothing is recent enough, fall back to the freshest so we still publish something)
    const prioritizeRecency = automation.prioritize_recency === true
    const MAX_FRESH_HOURS = 72
    const relevanceOf = (a) => {
      const mk = a.matchedKeywords
      if (Array.isArray(mk)) return mk.length
      if (typeof mk === 'string') return mk.split(',').filter(Boolean).length
      return 0
    }
    const ageHoursOf = (a) => (Date.now() - new Date(a.publishedAt || 0).getTime()) / 3600000
    const byRecency = (a, b) => (new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    const byRelevance = (a, b) => (relevanceOf(b) - relevanceOf(a))

    // Instant mode also draws from the already-fetched pending backlog for this automation —
    // not just brand-new items — so an hourly run still publishes when the feed has no fresh
    // items but a backlog is waiting. Backlog items carry their Airtable `id` (update in place).
    const instantCandidates = instantPublish
      ? (() => {
          const seen = new Set(newArticles.map(a => a.url))
          const backlog = existingArticles.filter(a =>
            a.automation_id === automation.id && a.status === 'pending' && a.url && !seen.has(a.url))
          return [...newArticles, ...backlog]
        })()
      : newArticles

    let ranked
    if (instantPublish) {
      if (prioritizeRecency) {
        ranked = [...instantCandidates].sort((a, b) => byRecency(a, b) || byRelevance(a, b))
      } else {
        const fresh = instantCandidates.filter(a => ageHoursOf(a) <= MAX_FRESH_HOURS)
        const pool = fresh.length > 0 ? fresh : instantCandidates
        ranked = [...pool].sort((a, b) => byRelevance(a, b) || byRecency(a, b))
      }
    } else {
      ranked = newArticles
        .map(a => ({ ...a, keywordCount: a.matchedKeywords ? a.matchedKeywords.length : 0 }))
        .sort((a, b) => b.keywordCount - a.keywordCount)
    }

    const pipelineSize = Math.max(30, maxArticles * 5)
    const allCandidates = ranked.slice(0, pipelineSize)
    console.log(`[AUTO-PIPELINE] [${automation.name}] ${ranked.length} total after ranking, taking ${allCandidates.length} candidates (pipeline size ${pipelineSize})`)
    const shouldAutoSchedule = !fetchOnly && (automation.auto_schedule === true)

    // How many to commit this run. Scheduled mode: a full daily batch. Instant mode: pace toward
    // the remaining daily budget across the hours left in the day (≈1/run), counting articles
    // already committed today (selected or published) so the daily cap is never exceeded.
    let runBudget = maxArticles
    if (instantPublish) {
      const todayKey = new Date().toISOString().split('T')[0]
      const committedToday = existingArticles.filter(a =>
        a.automation_id === automation.id &&
        (a.status === 'selected' || a.status === 'published') &&
        a.publishedAt && new Date(a.publishedAt).toISOString().split('T')[0] === todayKey
      ).length
      const remainingToday = Math.max(0, maxArticles - committedToday)
      const hoursLeft = Math.max(1, 24 - new Date().getUTCHours())
      runBudget = Math.min(remainingToday, Math.max(1, Math.ceil(remainingToday / hoursLeft)))
    }

    const toAutoSchedule = shouldAutoSchedule ? allCandidates.slice(0, runBudget) : []
    const toPending = shouldAutoSchedule
      ? (instantPublish ? [] : allCandidates.slice(runBudget))
      : allCandidates

    console.log(`[AUTO-PIPELINE] [${automation.name}] ${allCandidates.length} candidates: ${toAutoSchedule.length} to auto-schedule, ${toPending.length} as pending`)

    if (!fetchOnly) {
      const MIN_CONTENT_LENGTH = 300
      for (const article of allCandidates) {
        const currentContent = article.originalContent || article.description || ''
        if (currentContent.replace(/<[^>]+>/g, '').length < MIN_CONTENT_LENGTH && article.url) {
          try {
            const scraped = await scrapeArticleContent(article.url)
            if (scraped.length > currentContent.replace(/<[^>]+>/g, '').length) {
              article.originalContent = scraped
              console.log(`[AUTO-PIPELINE] [${automation.name}] Scraped full content for: ${article.title.substring(0, 50)} (${scraped.length} chars)`)
            }
          } catch (err) {
            console.error(`[AUTO-PIPELINE] [${automation.name}] Scrape failed for ${article.url}:`, err.message)
          }
        }
      }
    }

    if (toPending.length > 0) {
      const pendingPayload = toPending.map(article => ({
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
      }))
      try {
        await createArticlesBatch(pendingPayload)
        for (const a of toPending) existingUrls.add(a.url)
      } catch (err) {
        console.error(`[AUTO-PIPELINE] [${automation.name}] Batch save pending failed:`, err.message)
      }
    }

    // Count articles already scheduled per calendar day so each day can be filled up to
    // articles_per_day (maxArticles) before moving to the next — i.e. N per day, not 1 per day.
    const dayCounts = {}
    for (const a of existingArticles) {
      if (a.automation_id === automation.id && a.status === 'selected' && a.publishedAt) {
        const day = new Date(a.publishedAt).toISOString().split('T')[0]
        dayCounts[day] = (dayCounts[day] || 0) + 1
      }
    }

    function getNextAvailableDate(startFrom) {
      const d = new Date(startFrom)
      let dayKey = d.toISOString().split('T')[0]
      while ((dayCounts[dayKey] || 0) >= maxArticles) {
        d.setDate(d.getDate() + 1)
        dayKey = d.toISOString().split('T')[0]
      }
      const slot = dayCounts[dayKey] || 0
      dayCounts[dayKey] = slot + 1
      // Stagger same-day articles through the day (07:00, then +2h per slot) so they
      // don't all share one timestamp and publish more naturally across the day.
      d.setHours(7 + slot * 2, 0, 0, 0)
      return d
    }

    const startDay = new Date()
    startDay.setDate(startDay.getDate() + 1)
    startDay.setHours(0, 0, 0, 0)

    const results = []

    for (const article of toAutoSchedule) {
      let articleId = article.id || null  // backlog items already exist in Airtable
      let createdHere = false
      try {
        const scheduledDate = instantPublish ? new Date() : getNextAvailableDate(startDay)

        if (!articleId) {
          const created = await createArticle({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source,
            publishedAt: scheduledDate.toISOString(),
            // Create as 'pending' (not publishable) until the rewrite below finishes and flips
            // it to 'selected'. Otherwise, in instant mode (publishedAt=now), the auto-publish
            // cron can grab the un-rewritten source version (wrong language, no header image)
            // in the window before the rewrite completes.
            status: 'pending',
            category: article.category,
            originalContent: article.originalContent || '',
            imageUrl: article.imageUrl || '',
            matchedKeywords: article.matchedKeywords || [],
            automation_id: automation.id,
          })
          articleId = created.id
          createdHere = true
        }

        let customInstructions = automation.extra_context || ''
        let aiSettings = {}
        try { if (automation.ai_settings) aiSettings = JSON.parse(automation.ai_settings) } catch {}

        const instructions = []
        if (customInstructions) instructions.push(customInstructions)

        if (aiSettings.include_faq === false) instructions.push('Do NOT include a FAQ section.')
        if (aiSettings.include_images === false) instructions.push('Do NOT include inline images.')
        if (aiSettings.include_charts === false) instructions.push('Do NOT include charts or data tables.')
        if (aiSettings.include_sources === false) instructions.push('Do NOT include a sources section.')
        if (aiSettings.include_quotes === false) instructions.push('Do NOT include generated quotes.')

        if (aiSettings.internal_links) {
          const maxLinks = aiSettings.max_internal_links || 2
          instructions.push(`INTERNAL LINKING (max ${maxLinks} links total per article):\n${aiSettings.internal_links}`)
        }

        if (aiSettings.url_rules && aiSettings.url_rules.length > 0) {
          const rules = aiSettings.url_rules.map(r =>
            `- When mentioning "${r.keyword}", link it to ${r.url}${r.label ? ` with anchor text "${r.label}"` : ''}`
          ).join('\n')
          instructions.push(`KEYWORD LINKS (always apply these):\n${rules}`)
        }

        const seoContext = []
        if (automation.site_name) seoContext.push(`Website: ${automation.site_name}`)
        if (automation.site_url) seoContext.push(`URL: ${automation.site_url}`)
        if (automation.keywords) seoContext.push(`Site niche keywords: ${automation.keywords}`)
        if (automation.tags) seoContext.push(`Content tags/topics: ${automation.tags}`)
        if (seoContext.length > 0) {
          instructions.push(`SEO CONTEXT — Choose focus keywords and SEO keywords that are relevant for this website and its audience:\n${seoContext.join('\n')}\nThe focus keyword should match what this site's target audience would search for. Combine the article topic with the site's niche to find the best keyword angle.`)
        }

        let brandColors = null
        try { if (automation.site_brand_colors) brandColors = JSON.parse(automation.site_brand_colors) } catch {}
        if (brandColors?.primary) {
          instructions.push(`BRAND COLORS: Use these colors for all visual elements (stat blocks, charts, bar charts, tables, highlights):\n- Primary accent: ${brandColors.primary}\n- Secondary: ${brandColors.secondary || brandColors.primary}\n- Text: ${brandColors.text || '#374151'}\nDo NOT use the default indigo (#4f46e5). Use the brand colors above instead.`)
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

        let headerImage = article.imageUrl
        const isPlaceholderImg = !headerImage || headerImage.includes('placehold.co')
        if (isPlaceholderImg && aiSettings.include_header_image !== false) {
          try {
            headerImage = await findHeaderImage(rewritten.title, article.matchedKeywords)
          } catch {}
        }

        const cleanTopic = rewritten.category ? rewritten.category.replace(/^["']+|["']+$/g, '').trim() : null
        await updateArticle(articleId, {
          title: rewritten.title,
          content_rewritten: rewritten.content,
          content_html: rewritten.content_html,
          subtitle: rewritten.subtitle || '',
          faq: (Array.isArray(rewritten.faq) && rewritten.faq.length > 0) ? JSON.stringify(rewritten.faq) : '',
          ...(rewritten.focus_keyword ? { focus_keyword: rewritten.focus_keyword } : {}),
          ...(rewritten.meta_description ? { meta_description: rewritten.meta_description } : {}),
          ...(rewritten.seo_keywords?.length ? { seo_keywords: rewritten.seo_keywords.join(', ') } : {}),
          ...(headerImage ? { imageUrl: headerImage } : {}),
          ...(cleanTopic ? { topic: cleanTopic } : {}),
          // Instant mode: stamp publishedAt=now so the auto-publish cron picks it up this run
          // (matters for backlog items, whose stored publishedAt is their old fetch time).
          ...(instantPublish ? { publishedAt: scheduledDate.toISOString() } : {}),
          status: 'selected',
        })

        existingUrls.add(article.url)

        console.log(`[AUTO-PIPELINE] [${automation.name}] Scheduled: ${rewritten.title} for ${scheduledDate.toISOString().split('T')[0]}`)
        results.push({ originalTitle: article.title, rewrittenTitle: rewritten.title, status: 'scheduled', scheduledFor: scheduledDate.toISOString().split('T')[0] })
      } catch (error) {
        console.error(`[AUTO-PIPELINE] [${automation.name}] Error: ${article.title}:`, error)
        if (articleId && createdHere) {
          try {
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
    // WordPress/HubSpot publish via their own APIs — every other platform uses the push mechanism.
    const usesPush = automation.site_platform !== 'wordpress' && automation.site_platform !== 'hubspot'
    if (!usesPush || !automation.site_api_key || !automation.site_url) continue

    try {
const payloads = toPush.filter(a => {
        const hasContent = !!(a.content_html?.trim() || a.content_rewritten?.trim())
        if (!hasContent) {
          console.warn(`[AUTO-PIPELINE] Skipping push for article without rewritten content: ${a.title?.substring(0, 60)}`)
        }
        return hasContent
      }).map(a => buildArticlePayload(a))

      const result = await pushArticlesToSite({ automation, payloads })
      pushResults.push({
        automation_id: automation.id,
        automation_name: automation.name,
        pushed: payloads.length,
        success: result.success,
        received: result.pushed,
        total: result.total,
        ...(result.error ? { error: result.error } : {}),
      })
      if (result.success) {
        console.log(`[AUTO-PIPELINE] Pushed ${result.pushed} new articles to ${automation.name}`)
      } else {
        console.error(`[AUTO-PIPELINE] Push not confirmed for ${automation.name}: ${result.error}`)
      }
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
        })
        console.log(`[AUTO-PIPELINE] Triggered deploy webhook for ${automation.name}: ${webhookRes.status}`)
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
  return summary
}

module.exports = { runAutoPipeline }
