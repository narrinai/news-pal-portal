import type { Config } from "@netlify/functions"

// Fires daily at 08:00 UTC — an hour after the news pipeline, so a longread generated
// today can draw on the material that run just collected. The pipeline itself skips
// automations whose weekly/biweekly/monthly cadence isn't due, so most days are a no-op.
export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://newspalportal.netlify.app'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)

    const res = await fetch(`${siteUrl}/api/cron/longread`, {
      method: 'POST',
      headers: {
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const data = await res.json()
    console.log('[SCHEDULED] Longread result:', JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error: any) {
    console.error('[SCHEDULED] Longread failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export const config: Config = {
  schedule: "0 8 * * *"
}
