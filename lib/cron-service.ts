import * as cron from 'node-cron'
import { fetchAllFeeds } from './rss-parser'
import { createArticle, getArticles, updateArticle, getAutomations } from './airtable'
import { rewriteArticle } from './ai-rewriter'

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

  async executeAutoPipeline(): Promise<{success: boolean, published: number, error?: string}> {
    try {
      // Get all enabled automations
      const automations = await getAutomations()
      const enabled = automations.filter(a => a.enabled)

      console.log(`[AUTO-PIPELINE] Found ${automations.length} automations, ${enabled.length} enabled`)

      if (enabled.length === 0) {
        console.log('[AUTO-PIPELINE] No enabled automations, skipping')
        return { success: true, published: 0 }
      }

      // Fetch articles from RSS feeds (once, shared across automations)
      const articles = await fetchAllFeeds()
      console.log(`[AUTO-PIPELINE] Fetched ${articles.length} articles from RSS feeds`)

      // Get existing articles to avoid duplicates
      const existingArticles = await getArticles()
      const existingUrls = new Set(existingArticles.map(a => a.url))

      let totalPublished = 0

      for (const automation of enabled) {
        console.log(`[AUTO-PIPELINE] Processing automation: ${automation.name} (${automation.id})`)

        const maxArticles = automation.articles_per_day || 2
        const enabledCategories = automation.categories
          ? automation.categories.split(',').map((c: string) => c.trim()).filter(Boolean)
          : []

        // Filter for this automation
        let newArticles = articles.filter(a => !existingUrls.has(a.url))

        if (enabledCategories.length > 0) {
          newArticles = newArticles.filter(a => enabledCategories.includes((a as any).category))
        }

        console.log(`[AUTO-PIPELINE] [${automation.name}] ${newArticles.length} new articles after filter`)

        if (newArticles.length === 0) continue

        // Rank by keyword count and pick top N
        const ranked = newArticles
          .map(a => ({ ...a, keywordCount: (a as any).matchedKeywords?.length || 0 }))
          .sort((a: any, b: any) => b.keywordCount - a.keywordCount)
          .slice(0, maxArticles)

        for (const article of ranked) {
          try {
            const created = await createArticle({
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source,
              publishedAt: article.publishedAt,
              status: 'selected' as const,
              category: (article as any).category,
              originalContent: (article as any).originalContent || '',
              imageUrl: (article as any).imageUrl || '',
              matchedKeywords: (article as any).matchedKeywords || [],
              automation_id: automation.id,
            })

            const rewritten = await rewriteArticle(
              article.title,
              (article as any).originalContent || article.description,
              {
                style: (automation.style || 'news') as any,
                length: (automation.length || 'medium') as any,
                language: (automation.language || 'nl') as any,
                tone: 'informative' as any,
              },
              undefined,
              article.url
            )

            await updateArticle(created.id, {
              title: rewritten.title,
              subtitle: rewritten.subtitle || '',
              content_rewritten: rewritten.content,
              content_html: rewritten.content_html,
              faq: rewritten.faq ? JSON.stringify(rewritten.faq) : '',
              status: 'published',
            })

            // Prevent other automations from duplicating
            existingUrls.add(article.url)

            console.log(`[AUTO-PIPELINE] [${automation.name}] Published: ${rewritten.title}`)
            totalPublished++
          } catch (error) {
            console.error(`[AUTO-PIPELINE] [${automation.name}] Error processing "${article.title}":`, error)
          }
        }
      }

      console.log(`[AUTO-PIPELINE] Completed: ${totalPublished} articles published across ${enabled.length} automations`)
      return { success: true, published: totalPublished }
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
