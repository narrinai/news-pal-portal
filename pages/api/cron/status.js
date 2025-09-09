import { cronService } from '../../../lib/cron-service'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const allJobs = cronService.getAllJobsStatus()
    const dailyFetchStatus = cronService.getJobStatus('daily-news-fetch')
    
    return res.status(200).json({
      dailyNewsFetch: {
        ...dailyFetchStatus,
        schedule: '6:00 AM daily (Europe/Amsterdam timezone)',
        nextRun: dailyFetchStatus.scheduled ? 'Next 6:00 AM' : 'Not scheduled'
      },
      allJobs
    })
  } catch (error) {
    console.error('[CRON API] Error getting cron status:', error)
    return res.status(500).json({ 
      error: 'Failed to get cron status', 
      details: error.message
    })
  }
}