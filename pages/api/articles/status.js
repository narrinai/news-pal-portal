import { getAutomation } from '../../../lib/airtable'

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')

  const { automation_id } = req.query

  if (!automation_id) {
    return res.status(400).json({ error: 'automation_id is required' })
  }

  try {
    const automation = await getAutomation(automation_id)

    if (!automation) {
      return res.status(404).json({ connected: false, error: 'Automation not found' })
    }

    return res.status(200).json({
      connected: true,
      automation_id: automation.id,
      name: automation.name,
      enabled: automation.enabled,
      language: automation.language,
      site_name: automation.site_name || null,
      site_url: automation.site_url || null,
      integration_type: automation.integration_type || null,
      card_template: automation.site_template || null,
      detail_template: automation.site_detail_template || null,
    })
  } catch (error) {
    console.error('Error fetching automation status:', error)
    return res.status(500).json({ error: 'Failed to fetch status' })
  }
}
