import { cronService } from './cron-service'

// Initialize cron jobs when the application starts
export function initializeCronJobs() {
  if (typeof window === 'undefined') { // Only run on server side
    console.log('[INIT] Initializing cron jobs...')
    
    try {
      // Start the daily news fetch job
      cronService.startDailyNewsFetch()
      console.log('[INIT] Cron jobs initialized successfully')
    } catch (error) {
      console.error('[INIT] Error initializing cron jobs:', error)
    }
  }
}

// Auto-initialize when this module is imported
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  initializeCronJobs()
}