import { getAutomation, updateAutomation, deleteAutomation } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const automation = await getAutomation(id)
      if (!automation) {
        return res.status(404).json({ error: 'Automation not found' })
      }
      return res.status(200).json(automation)
    } catch (error) {
      console.error(`Error fetching automation ${id}:`, error)
      return res.status(500).json({ error: 'Failed to fetch automation' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const updated = await updateAutomation(id, req.body)
      return res.status(200).json(updated)
    } catch (error) {
      console.error(`Error updating automation ${id}:`, error)
      return res.status(500).json({ error: 'Failed to update automation' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteAutomation(id)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(`Error deleting automation ${id}:`, error)
      return res.status(500).json({ error: 'Failed to delete automation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
