import { getAutomation } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id, slugs } = req.body

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: 'Missing or empty slugs array' })
  }

  try {
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    if (!automation.site_url || !automation.site_api_key) {
      return res.status(200).json({ success: false, error: 'No site URL or API key configured' })
    }

    if (automation.site_platform === 'wordpress' || automation.site_platform === 'hubspot') {
      return res.status(200).json({ success: false, error: 'Delete not supported for WordPress/HubSpot' })
    }

    const targetUrl = automation.replit_url || automation.site_url
    const origin = new URL(targetUrl).origin
    const deleteUrl = `${origin}/newspal/delete`

    console.log(`[delete-articles] Deleting ${slugs.length} article(s) from ${deleteUrl}`)

    const deleteRes = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-newspal-key': automation.site_api_key,
      },
      body: JSON.stringify({ slugs }),
    })

    const data = await deleteRes.json().catch(() => ({}))

    if (!deleteRes.ok) {
      return res.status(200).json({
        success: false,
        error: `Site returned ${deleteRes.status}: ${JSON.stringify(data).slice(0, 200)}`,
      })
    }

    return res.status(200).json({
      success: true,
      deleted: data.deleted || slugs.length,
      remaining: data.remaining,
    })
  } catch (error) {
    console.error('[delete-articles] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: error.message,
    })
  }
}
