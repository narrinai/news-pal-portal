console.log("[REWRITE-BG] cold start, node:", process.version)
import { doRewrite } from "../../lib/do-rewrite.js"

// Netlify Background Function: 15-min timeout, returns 202 to caller instantly.
// Triggered by the Next.js /api/articles/rewrite foreground handler so the AI
// rewrite reliably runs to completion and the result is written to Airtable —
// unlike a fire-and-forget self-fetch, which serverless can kill mid-flight.
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

  const { id, options, customInstructions } = payload
  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), { status: 400 })
  }

  console.log("[REWRITE-BG] Starting rewrite for", id)

  try {
    const rewritten = await doRewrite(id, options, customInstructions)
    console.log("[REWRITE-BG] Done:", rewritten?.title?.substring(0, 50))
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    console.error("[REWRITE-BG] Failed:", error?.message || error)
    return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500 })
  }
}
