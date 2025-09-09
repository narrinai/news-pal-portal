import { refreshRSSCache } from '../../../lib/article-manager'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      refreshRSSCache()
      return res.status(200).json({ 
        success: true, 
        message: 'RSS cache cleared successfully' 
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
      return res.status(500).json({ 
        error: 'Failed to clear cache',
        details: error.message
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}