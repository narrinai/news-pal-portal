import { cronService } from '../../../lib/cron-service'

// Auto-start cron jobs in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  cronService.startDailyNewsFetch()
  cronService.startAutoPipeline()
  console.log('[AUTO-START] Daily news fetch + auto-pipeline cron jobs auto-started')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fetchSuccess = cronService.startDailyNewsFetch()
    const pipelineSuccess = cronService.startAutoPipeline()

    return res.status(200).json({
      success: fetchSuccess && pipelineSuccess,
      message: 'Daily news fetch + auto-pipeline cron jobs started',
      jobs: {
        'daily-news-fetch': { ...cronService.getJobStatus('daily-news-fetch'), schedule: '6:00 AM' },
        'auto-pipeline': { ...cronService.getJobStatus('auto-pipeline'), schedule: '7:00 AM' },
      },
      timezone: 'Europe/Amsterdam',
    })
  } catch (error) {
    console.error('[CRON API] Error starting cron job:', error)
    return res.status(500).json({ 
      error: 'Failed to start cron job', 
      details: error.message
    })
  }
}