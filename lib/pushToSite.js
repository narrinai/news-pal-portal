// Shared helper for pushing articles to a connected site's /newspal/receive endpoint.
// Used by both the manual push API (pages/api/sites/push-articles.js) and the hourly
// cron (pages/api/cron/auto-publish.js) so the payload shape and the success-detection
// logic live in ONE place and cannot drift between the two code paths.

const PLACEHOLDER_HOST = 'placehold.co'

export function toSlug(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// Build the exact JSON shape a connected site expects. Body HTML is sent under three
// keys so it matches the public API contract (/api/articles/public returns `html` +
// `content`): generated site code renders `html`; `content_html` stays for older sites.
export function buildArticlePayload(a, { category } = {}) {
  const bodyHtml =
    a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`

  const descSource = a.subtitle || a.description || ''
  const cleanDesc = descSource.replace(/<[^>]+>/g, '').trim()
  const description = cleanDesc.length > 200 ? cleanDesc.substring(0, 200).trim() + '...' : cleanDesc

  return {
    id: a.id,
    slug: toSlug(a.title),
    title: a.title,
    description,
    content_html: bodyHtml,
    html: bodyHtml,
    content: (a.content_rewritten || a.description || '').replace(/<[^>]+>/g, '').trim(),
    category: category || a.topic || a.category,
    source: a.source,
    sourceUrl: a.url,
    imageUrl:
      a.imageUrl ||
      `https://${PLACEHOLDER_HOST}/1200x630/4f46e5/ffffff?text=${encodeURIComponent((a.title || 'Article').substring(0, 30))}`,
    subtitle: a.subtitle || '',
    publishedAt: a.publishedAt,
    faq: a.faq || null,
  }
}

// Push already-built payloads to the site in batches, verifying each batch was genuinely
// accepted. A 200 alone is NOT proof: SPA/static sites answer unknown routes (a missing
// /newspal/receive) with their index.html and a 200 — so we require a real JSON response
// carrying a `received`/`success` field, otherwise we report a clear, actionable failure.
// Returns { success, pushed, total, error }.
export async function pushArticlesToSite({ automation, payloads, batchSize = 3 }) {
  const targetUrl = automation.replit_url || automation.site_url
  const origin = new URL(targetUrl).origin
  const pushUrl = `${origin}/newspal/receive`
  console.log(
    `[pushToSite] Pushing ${payloads.length} article(s) to ${pushUrl} with key ${automation.site_api_key?.slice(0, 10)}...`
  )

  let pushed = 0
  let total = 0

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1

    const pushRes = await fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-newspal-key': automation.site_api_key,
      },
      body: JSON.stringify({ articles: batch }),
    })

    const contentType = pushRes.headers.get('content-type') || ''
    const rawBody = await pushRes.text()
    let data = null
    try {
      data = JSON.parse(rawBody)
    } catch {
      /* not JSON */
    }
    console.log(`[pushToSite] Response: ${pushRes.status} (${contentType})`, rawBody.slice(0, 200))

    if (!pushRes.ok) {
      return { success: false, pushed, total, error: `Site returned ${pushRes.status} on batch ${batchNum}` }
    }

    const looksLikeJson = contentType.includes('application/json') && data && typeof data === 'object'
    const acknowledged = looksLikeJson && (typeof data.received === 'number' || data.success === true)
    if (!acknowledged) {
      const hint = !looksLikeJson
        ? `the site returned ${contentType.includes('html') ? 'HTML' : `"${contentType}"`} instead of JSON — the /newspal/receive endpoint is missing or not registered`
        : 'the response did not include a "received" count — the endpoint did not store the articles'
      return { success: false, pushed, total, error: `Push not confirmed by ${origin}: ${hint}` }
    }

    pushed += data.received ?? batch.length
    total = data.total || total
  }

  return { success: true, pushed, total }
}
