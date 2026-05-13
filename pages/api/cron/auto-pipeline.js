import { runAutoPipeline } from '../../../lib/run-auto-pipeline'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Vercel Cron secret in production
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const force = req.body?.force === true || req.query?.force === 'true'
  const fetchOnly = req.body?.fetchOnly === true
  const singleAutomationId = req.body?.automation_id || null

  // POST from dashboard: dispatch to Netlify Background Function (15min timeout)
  // so the heavy pipeline work isn't constrained by the 10s sync API-route limit.
  // On Vercel (or local without netlify dev) the background URL won't respond as
  // expected — fall back to running synchronously.
  if (req.method === 'POST') {
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const host = req.headers.host || 'localhost:3000'
    const bgUrl = `${proto}://${host}/.netlify/functions/auto-pipeline-run-background`

    try {
      const bgRes = await fetch(bgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
        body: JSON.stringify({ force, fetchOnly, automation_id: singleAutomationId }),
      })

      // Background functions return 202 Accepted on Netlify
      if (bgRes.status === 202) {
        console.log('[AUTO-PIPELINE] Dispatched to background function')
        return res.status(202).json({
          success: true,
          started: true,
          message: 'Pipeline started in background',
          automation_id: singleAutomationId,
        })
      }
      console.warn(`[AUTO-PIPELINE] Background dispatch unexpected status ${bgRes.status}, falling back to sync`)
    } catch (err) {
      console.warn('[AUTO-PIPELINE] Background dispatch failed, falling back to sync:', err.message)
    }
  }

  // GET (Vercel cron) or fallback path: run inline.
  try {
    const result = await runAutoPipeline({ force, fetchOnly, singleAutomationId })
    return res.status(200).json(result)
  } catch (error) {
    console.error('[AUTO-PIPELINE] Fatal error:', error)
    return res.status(500).json({
      error: 'Auto-pipeline failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
