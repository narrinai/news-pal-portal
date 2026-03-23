import { getArticles, updateArticle, getAutomations } from '../../../lib/airtable'

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

      // Push to Replit site
      if (automation.site_platform === 'replit' && automation.site_api_key && automation.site_url) {
        try {
          const publishedArticles = articles.map(a => ({
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
            automation: automation.name,
            pushed: publishedArticles.length,
            received: pushData.received || 0,
            status: pushRes.status,
          })
          console.log(`[AUTO-PUBLISH] Pushed ${pushData.received || 0} articles to ${automation.name}: ${pushRes.status}`)
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
