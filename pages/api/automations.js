import { getAutomations, createAutomation } from '../../lib/airtable'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const automations = await getAutomations()
      return res.status(200).json(automations)
    } catch (error) {
      console.error('Error fetching automations:', error)
      return res.status(500).json({ error: 'Failed to fetch automations' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, enabled, articles_per_day, categories, style, length, language } = req.body
      if (!name) {
        return res.status(400).json({ error: 'Name is required' })
      }
      const automation = await createAutomation({
        name,
        enabled: !!enabled,
        articles_per_day: articles_per_day || 1,
        categories: categories || '',
        style: style || 'news',
        length: length || 'extra-long',
        language: language || 'en',
      })
      return res.status(201).json(automation)
    } catch (error) {
      console.error('Error creating automation:', error)
      return res.status(500).json({ error: 'Failed to create automation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
