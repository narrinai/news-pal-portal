import { runAutoPipeline } from "../../lib/run-auto-pipeline.js"

// Netlify Background Function: 15-min timeout, returns 202 to caller instantly.
// Triggered by the Next.js /api/cron/auto-pipeline foreground handler when a
// dashboard user clicks "Fetch articles". Also callable directly by schedulers.
export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  let payload: any = {}
  try {
    payload = await req.json()
  } catch { /* allow empty body */ }

  const force = payload.force === true
  const fetchOnly = payload.fetchOnly === true
  const singleAutomationId = payload.automation_id ?? null

  console.log("[AUTO-PIPELINE-BG] Starting", { force, fetchOnly, singleAutomationId })

  try {
    const result = await runAutoPipeline({ force, fetchOnly, singleAutomationId })
    console.log("[AUTO-PIPELINE-BG] Done:", result.message)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error: any) {
    console.error("[AUTO-PIPELINE-BG] Failed:", error?.message || error)
    return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500 })
  }
}
