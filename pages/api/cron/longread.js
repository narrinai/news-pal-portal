import { runLongreadPipeline } from '../../../lib/longread-pipeline'
import { isAuthorizedCronRequest } from '../../../lib/cron-auth'

/**
 * Deep-dive longread pipeline. Runs daily; the pipeline itself decides per automation
 * whether its cadence (weekly/biweekly/monthly) falls due today, so this endpoint is
 * safe to call every day and a no-op on the other days.
 *
 * POST also accepts { automation_id, force } from the dashboard to generate one now.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const force = req.body?.force === true || req.query?.force === 'true'
  const singleAutomationId = req.body?.automation_id || req.query?.automation_id || null

  // Writing a longread is a multi-minute job (scrape a dossier, then two model calls),
  // far past the 10s sync API-route limit — hand it to the background function the way
  // the news pipeline does, and fall back to inline where that isn't available.
  if (req.method === 'POST') {
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const host = req.headers.host || 'localhost:3000'
    const bgUrl = `${proto}://${host}/.netlify/functions/longread-run-background`

    try {
      const bgRes = await fetch(bgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
        body: JSON.stringify({ force, automation_id: singleAutomationId }),
      })

      if (bgRes.status === 202) {
        console.log('[LONGREAD] Dispatched to background function')
        return res.status(202).json({
          success: true,
          started: true,
          message: 'Longread generation started in background',
          automation_id: singleAutomationId,
        })
      }
      console.warn(`[LONGREAD] Background dispatch unexpected status ${bgRes.status}, falling back to sync`)
    } catch (err) {
      console.warn('[LONGREAD] Background dispatch failed, falling back to sync:', err.message)
    }
  }

  try {
    const result = await runLongreadPipeline({ force, singleAutomationId })
    return res.status(200).json(result)
  } catch (error) {
    console.error('[LONGREAD] Fatal error:', error)
    return res.status(500).json({
      error: 'Longread pipeline failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
