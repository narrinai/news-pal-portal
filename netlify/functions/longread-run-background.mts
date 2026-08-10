console.log("[LONGREAD-BG] cold start, node:", process.version)
import { runLongreadPipeline } from "../../lib/longread-pipeline.js"

// Netlify Background Function: 15-min timeout, returns 202 instantly. A deep dive needs
// a dossier scrape plus two model calls, so it cannot run inside a normal API route.
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
  const singleAutomationId = payload.automation_id ?? null

  console.log("[LONGREAD-BG] Starting", { force, singleAutomationId })

  try {
    const result = await runLongreadPipeline({ force, singleAutomationId })
    console.log("[LONGREAD-BG] Done:", result.message)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error: any) {
    console.error("[LONGREAD-BG] Failed:", error?.message || error)
    return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500 })
  }
}
