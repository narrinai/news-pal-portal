import { cronService } from '../../../lib/cron-service'

// Auto-start cron jobs in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  cronService.startDailyNewsFetch()
  console.log('[AUTO-START] Daily news fetch cron job auto-started')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const success = cronService.startDailyNewsFetch()
    const status = cronService.getJobStatus('daily-news-fetch')
    
    return res.status(200).json({
      success,
      message: 'Daily news fetch cron job started',
      status,
      schedule: '6:00 AM daily (Europe/Amsterdam timezone)'
    })
  } catch (error) {
    console.error('[CRON API] Error starting cron job:', error)
    return res.status(500).json({ 
      error: 'Failed to start cron job', 
      details: error.message
    })
  }
}