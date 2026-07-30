import type { Config } from "@netlify/functions"

// Daily deploy cron (Netlify scheduled function). News Pal's real production runs on
// Netlify, so the once/day deploy must be scheduled here (not only in vercel.json).
// Fires each enabled automation's Netlify build hook once, throttling site rebuilds to
// 1/day instead of the ~8/day the old per-run webhook firing caused.
export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://newspalportal.netlify.app'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

    const res = await fetch(`${siteUrl}/api/cron/deploy-sites`, {
      method: 'POST',
      headers: {
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const data = await res.json()
    console.log('[SCHEDULED] Deploy-sites result:', JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error: any) {
    console.error('[SCHEDULED] Deploy-sites failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export const config: Config = {
  schedule: "0 7 * * *"
}
