import { getAutomations } from '../../../lib/airtable'

/**
 * Daily deploy cron — fires each enabled automation's Netlify build hook ONCE per day.
 *
 * Why this exists: firing the deploy webhook from the hourly content crons
 * (auto-pipeline / auto-publish) rebuilt each static site up to ~8x/day, burning
 * Netlify build minutes. The netlify.toml `ignore` throttle did NOT work for
 * build-hook-triggered deploys (Netlify only applies `ignore` to git-push builds),
 * so throttling is done here at the source: one build/day per site.
 *
 * Scheduled at 07:00 UTC (see vercel.json). Content still lands in the sites via the
 * per-run push; this daily build regenerates the static/SEO pages.
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
    const automations = await getAutomations()
    const targets = automations.filter(a => a.enabled && a.deploy_webhook_url)

    const results = []
    for (const automation of targets) {
      try {
        const resp = await fetch(automation.deploy_webhook_url, { method: 'POST' })
        results.push({ automation: automation.name, status: resp.status, triggered: true })
        console.log(`[DEPLOY-SITES] Triggered deploy for ${automation.name}: ${resp.status}`)
      } catch (err) {
        results.push({ automation: automation.name, triggered: false, error: err.message })
        console.error(`[DEPLOY-SITES] Webhook failed for ${automation.name}:`, err.message)
      }
    }

    return res.status(200).json({
      success: true,
      triggered: results.filter(r => r.triggered).length,
      total: targets.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[DEPLOY-SITES] Fatal error:', error)
    return res.status(500).json({ error: error.message || 'deploy-sites failed', timestamp: new Date().toISOString() })
  }
}
