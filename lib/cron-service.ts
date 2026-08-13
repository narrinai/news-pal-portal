import * as cron from 'node-cron'
import { fetchAllFeeds } from './rss-parser'
import { createArticle, getArticles } from './airtable'

class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map()

  startDailyNewsFetch() {
    // Stop existing job if it exists
    this.stopJob('daily-news-fetch')

    // Schedule daily news fetch at 6:00 AM every day
    const job = cron.schedule('0 6 * * *', async () => {
      await this.executeNewsFetch()
    }, {
      timezone: "Europe/Amsterdam"
    })

    this.jobs.set('daily-news-fetch', job)
    job.start()

    console.log('[CRON] Daily news fetch job scheduled for 6:00 AM every day')
    return true
  }

  startAutoPipeline() {
    this.stopJob('auto-pipeline')

    // Schedule auto-pipeline at 7:00 AM every day (1 hour after RSS fetch)
    const job = cron.schedule('0 7 * * *', async () => {
      await this.executeAutoPipeline()
    }, {
      timezone: "Europe/Amsterdam"
    })

    this.jobs.set('auto-pipeline', job)
    job.start()

    console.log('[CRON] Auto-pipeline scheduled for 7:00 AM every day')
    return true
  }

  stopJob(jobName: string) {
    const job = this.jobs.get(jobName)
    if (job) {
      job.stop()
      this.jobs.delete(jobName)
      console.log(`[CRON] Stopped job: ${jobName}`)
      return true
    }
    return false
  }

  async executeNewsFetch(): Promise<{success: boolean, newArticles: number, totalFetched: number, error?: string}> {
    try {
      console.log('[CRON] Starting scheduled RSS feed fetch...')

      // Fetch articles from RSS feeds
      const articles = await fetchAllFeeds()
      console.log(`[CRON] Fetched ${articles.length} articles from RSS feeds`)

      // Get existing articles to avoid duplicates
      console.log('[CRON] Getting existing articles from Airtable...')
      const existingArticles = await getArticles()
      console.log(`[CRON] Found ${existingArticles.length} existing articles`)

      const existingUrls = new Set(existingArticles.map(article => article.url))

      // Filter out articles that already exist
      const newArticles = articles.filter(article => !existingUrls.has(article.url))
      console.log(`[CRON] ${newArticles.length} new articles to add`)

      // Store new articles in Airtable
      const createdArticles: any[] = []
      for (const article of newArticles) {
        try {
          const created = await createArticle(article)
          createdArticles.push(created)
          console.log(`[CRON] Created article: ${article.title}`)
        } catch (error) {
          console.error('[CRON] Error creating article:', error)
        }
      }

      const result = {
        success: true,
        message: `Daily fetch completed: ${createdArticles.length} new articles added`,
        totalFetched: articles.length,
        newArticles: createdArticles.length,
        timestamp: new Date().toISOString()
      }

      console.log('[CRON] Daily fetch completed:', result)
      return {
        success: true,
        newArticles: createdArticles.length,
        totalFetched: articles.length
      }

    } catch (error) {
      console.error('[CRON] Error in daily fetch:', error)
      return {
        success: false,
        newArticles: 0,
        totalFetched: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * The in-process 7:00 job. It delegates to the one real pipeline
   * (lib/run-auto-pipeline.js) rather than keeping a second, simpler copy of it: that copy
   * published straight past the site's custom instructions, the same-story merge, the
   * relevance gate and the figure guard, so anything it produced was off-brand at best.
   */
  async executeAutoPipeline(): Promise<{success: boolean, published: number, error?: string}> {
    try {
      const { runAutoPipeline } = require('./run-auto-pipeline')
      const result = await runAutoPipeline({})
      const published = (result.automations || []).reduce((sum: number, a: any) => sum + (a.rewritten || 0), 0)
      console.log(`[AUTO-PIPELINE] Completed: ${published} articles published across ${(result.automations || []).length} automations`)
      return { success: result.success !== false, published }
    } catch (error) {
      console.error('[AUTO-PIPELINE] Fatal error:', error)
      return { success: false, published: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Manual trigger for testing
  async triggerNewsFetchNow(): Promise<{success: boolean, newArticles: number, totalFetched: number, error?: string}> {
    console.log('[CRON] Manually triggering news fetch...')
    return await this.executeNewsFetch()
  }

  getJobStatus(jobName: string): {scheduled: boolean, running: boolean} {
    const job = this.jobs.get(jobName)
    if (job) {
      return {
        scheduled: true,
        running: job.getStatus() === 'scheduled'
      }
    }
    return {
      scheduled: false,
      running: false
    }
  }

  getAllJobsStatus(): Record<string, {scheduled: boolean, running: boolean}> {
    const status: Record<string, {scheduled: boolean, running: boolean}> = {}
    this.jobs.forEach((job, jobName) => {
      status[jobName] = {
        scheduled: true,
        running: job.getStatus() === 'scheduled'
      }
    })
    return status
  }
}

// Create singleton instance
export const cronService = new CronService()
export default cronService
