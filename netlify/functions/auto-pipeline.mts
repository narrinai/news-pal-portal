import type { Config } from "@netlify/functions"

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://newspalportal.netlify.app'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

    const res = await fetch(`${siteUrl}/api/cron/auto-pipeline`, {
      method: 'POST',
      headers: {
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const data = await res.json()
    console.log('[SCHEDULED] Auto-pipeline result:', JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error: any) {
    console.error('[SCHEDULED] Auto-pipeline failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export const config: Config = {
  schedule: "0 7 * * *"
}
