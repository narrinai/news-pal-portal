import { getAutomations, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id } = req.body

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  try {
    const automations = await getAutomations()
    const automation = automations.find(a => a.id === automation_id)

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation not found' })
    }

    const checks = {
      automation_active: automation.enabled,
      has_categories: !!(automation.categories && automation.categories.length > 0),
      platform: automation.site_platform || null,
      site_url: automation.site_url || null,
    }

    // Check articles for this automation
    const articles = await getArticles()
    const automationArticles = articles.filter(a => a.automation_id === automation_id)
    const published = automationArticles.filter(a => a.status === 'published')
    const scheduled = automationArticles.filter(a => a.status === 'selected')

    checks.total_articles = automationArticles.length
    checks.published_articles = published.length
    checks.scheduled_articles = scheduled.length

    // Platform-specific checks
    if (automation.site_platform === 'replit') {
      checks.has_api_key = !!automation.site_api_key
      checks.has_site_url = !!automation.site_url

      if (automation.site_url && automation.site_api_key) {
        try {
          const origin = new URL(automation.site_url).origin
          const pingRes = await fetch(`${origin}/newspal/receive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-newspal-key': automation.site_api_key,
            },
            body: JSON.stringify({ articles: [] }),
          })
          checks.site_reachable = pingRes.ok || pingRes.status === 200
          checks.site_status = pingRes.status
        } catch (err) {
          checks.site_reachable = false
          checks.site_error = err.message
        }
      }
    } else if (automation.site_platform === 'netlify') {
      checks.has_webhook = !!automation.deploy_webhook_url

      if (automation.site_url) {
        try {
          const origin = new URL(automation.site_url).origin
          const pingRes = await fetch(origin, { method: 'HEAD', redirect: 'follow' })
          checks.site_reachable = pingRes.ok
          checks.site_status = pingRes.status
        } catch (err) {
          checks.site_reachable = false
          checks.site_error = err.message
        }
      }

      if (automation.deploy_webhook_url) {
        // Just validate the URL format, don't actually trigger a deploy
        try {
          new URL(automation.deploy_webhook_url)
          checks.webhook_valid = true
        } catch {
          checks.webhook_valid = false
        }
      }
    }

    // Determine overall health
    const issues = []
    if (!checks.automation_active) issues.push('Automation is disabled')
    if (!checks.has_categories) issues.push('No categories selected')
    if (checks.platform === 'replit' && !checks.has_api_key) issues.push('No API key configured')
    if (checks.platform === 'replit' && !checks.has_site_url) issues.push('No site URL configured')
    if (checks.platform === 'replit' && checks.site_reachable === false) issues.push('Cannot reach Replit site: ' + (checks.site_error || `HTTP ${checks.site_status}`))
    if (checks.platform === 'netlify' && !checks.has_webhook) issues.push('No deploy webhook URL')
    if (checks.platform === 'netlify' && checks.site_reachable === false) issues.push('Cannot reach site: ' + (checks.site_error || `HTTP ${checks.site_status}`))
    if (!checks.platform) issues.push('No platform connected')

    const healthy = issues.length === 0

    return res.status(200).json({
      success: true,
      healthy,
      issues,
      checks,
    })
  } catch (error) {
    console.error('[TEST-CONNECTION] Error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
