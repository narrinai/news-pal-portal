import type { Config } from "@netlify/functions"

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://newspal.netlify.app'

  try {
    const res = await fetch(`${siteUrl}/api/cron/auto-pipeline`, {
      method: 'POST',
      headers: {
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
    })

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
