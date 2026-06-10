import { getArticles, updateArticle, getAutomations } from '../../../lib/airtable'
import { buildArticlePayload, pushArticlesToSite } from '../../../lib/pushToSite'

/**
 * Lightweight cron endpoint that runs every hour to:
 * 1. Publish scheduled articles whose publishedAt time has passed
 * 2. Push newly published articles to connected sites
 * 3. Trigger deploy webhooks
 *
 * This is separate from auto-pipeline (which fetches RSS, rewrites, etc.)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Vercel Cron secret in production
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const now = new Date()
    const allArticles = await getArticles()

    // Find scheduled articles whose time has passed
    const due = allArticles.filter(a => {
      if (a.status !== 'selected' || !a.publishedAt) return false
      return new Date(a.publishedAt) <= now
    })

    if (due.length === 0) {
      return res.status(200).json({
        success: true,
        published: 0,
        message: 'No scheduled articles due for publication',
        timestamp: now.toISOString(),
      })
    }

    // Publish each due article
    const published = []
    for (const article of due) {
      try {
        await updateArticle(article.id, { status: 'published' })
        published.push(article)
        console.log(`[AUTO-PUBLISH] Published: ${article.title} (scheduled for ${article.publishedAt})`)
      } catch (err) {
        console.error(`[AUTO-PUBLISH] Failed to publish ${article.id}:`, err.message)
      }
    }

    if (published.length === 0) {
      return res.status(200).json({
        success: true,
        published: 0,
        message: 'All due articles failed to publish',
        timestamp: now.toISOString(),
      })
    }

    // Group published articles by automation
    const byAutomation = {}
    for (const article of published) {
      const aid = article.automation_id
      if (!aid) continue
      if (!byAutomation[aid]) byAutomation[aid] = []
      byAutomation[aid].push(article)
    }

    // Push to connected sites and trigger webhooks
    const automations = await getAutomations()
    const automationMap = Object.fromEntries(automations.map(a => [a.id, a]))

    const pushResults = []
    for (const [automationId, articles] of Object.entries(byAutomation)) {
      const automation = automationMap[automationId]
      if (!automation) continue

      // Push to connected site (push mechanism) — WordPress/HubSpot use their own APIs.
      const usesPush = automation.site_platform !== 'wordpress' && automation.site_platform !== 'hubspot'
      if (usesPush && automation.site_api_key && automation.site_url) {
        try {
          // Shared payload builder + verified push — same contract as the manual push API.
          const payloads = articles.map(a => buildArticlePayload(a))
          const result = await pushArticlesToSite({ automation, payloads })
          pushResults.push({
            automation: automation.name,
            pushed: payloads.length,
            received: result.pushed,
            success: result.success,
            ...(result.error ? { error: result.error } : {}),
          })
          if (result.success) {
            console.log(`[AUTO-PUBLISH] Pushed ${result.pushed} articles to ${automation.name}`)
          } else {
            console.error(`[AUTO-PUBLISH] Push not confirmed for ${automation.name}: ${result.error}`)
          }
        } catch (err) {
          pushResults.push({ automation: automation.name, error: err.message })
          console.error(`[AUTO-PUBLISH] Push failed for ${automation.name}:`, err.message)
        }
      }

      // Trigger deploy webhook
      if (automation.deploy_webhook_url) {
        try {
          await fetch(automation.deploy_webhook_url, { method: 'POST' })
          console.log(`[AUTO-PUBLISH] Triggered webhook for ${automation.name}`)
        } catch (err) {
          console.error(`[AUTO-PUBLISH] Webhook failed for ${automation.name}:`, err.message)
        }
      }
    }

    return res.status(200).json({
      success: true,
      published: published.length,
      articles: published.map(a => ({ id: a.id, title: a.title, automation_id: a.automation_id })),
      pushes: pushResults.length > 0 ? pushResults : undefined,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[AUTO-PUBLISH] Fatal error:', error)
    return res.status(500).json({
      error: 'Auto-publish failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
