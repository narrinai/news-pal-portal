import { getAutomationSettings, saveAutomationSettings } from '../../lib/airtable'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const settings = await getAutomationSettings()
      return res.status(200).json(settings)
    } catch (error) {
      console.error('Error getting automation settings:', error)
      return res.status(500).json({ error: 'Failed to get automation settings' })
    }
  }

  if (req.method === 'POST') {
    try {
      const saved = await saveAutomationSettings(req.body)
      return res.status(200).json(saved)
    } catch (error) {
      console.error('Error saving automation settings:', error)
      return res.status(500).json({ error: 'Failed to save automation settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
