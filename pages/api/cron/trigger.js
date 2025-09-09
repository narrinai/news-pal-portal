import { cronService } from '../../../lib/cron-service'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[CRON API] Manual trigger requested')
    const result = await cronService.triggerNewsFetchNow()
    
    return res.status(200).json({
      ...result,
      message: `Manual fetch completed: ${result.newArticles} new articles added`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CRON API] Error triggering manual fetch:', error)
    return res.status(500).json({ 
      error: 'Failed to trigger manual fetch', 
      details: error.message
    })
  }
}