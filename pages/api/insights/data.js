import { querySearchAnalytics } from '../../../lib/gsc'
import { getAutomation, getArticles } from '../../../lib/airtable'
import { toSlug } from '../../../lib/pushToSite'

// Format a Date as YYYY-MM-DD (GSC expects this, in the property's timezone).
function fmt(d) {
  return d.toISOString().slice(0, 10)
}

function sumRows(rows) {
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0)
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0)
  // CTR / position must be re-derived — averaging GSC's per-row values is wrong.
  const ctr = impressions > 0 ? clicks / impressions : 0
  const position =
    impressions > 0
      ? rows.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0) / impressions
      : 0
  return { clicks, impressions, ctr, position }
}

// GET /api/insights/data?automation_id=X&range=28
export default async function handler(req, res) {
  const { automation_id, range } = req.query
  if (!automation_id) return res.status(400).json({ error: 'automation_id is required' })

  const automation = await getAutomation(String(automation_id))
  if (!automation) return res.status(404).json({ error: 'Automation not found' })

  const property = (automation.gsc_property || automation.site_url || '').trim()
  if (!property) {
    return res.status(400).json({ error: 'no_property', message: 'No GSC property linked to this automation yet.' })
  }

  const days = Math.min(Math.max(parseInt(range, 10) || 28, 1), 480)
  const end = new Date()
  end.setDate(end.getDate() - 2) // GSC data lags ~2 days; use the freshest complete window
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const startDate = fmt(start)
  const endDate = fmt(end)

  try {
    const [totalRows, trendRows, queryRows, pageRows, articles] = await Promise.all([
      querySearchAnalytics(property, { startDate, endDate }),
      querySearchAnalytics(property, { startDate, endDate, dimensions: ['date'] }),
      querySearchAnalytics(property, { startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
      querySearchAnalytics(property, { startDate, endDate, dimensions: ['page'], rowLimit: 1000 }),
      getArticles('published', undefined, String(automation_id)),
    ])

    const totals = sumRows(totalRows)

    const trend = trendRows
      .map((r) => ({ date: r.keys?.[0], clicks: r.clicks, impressions: r.impressions }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))

    const topQueries = queryRows.map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))

    // Match published articles to GSC pages by slug contained in the page URL.
    // This survives site-specific path prefixes (/, /article/, /news/ ...).
    const pages = pageRows.map((r) => ({
      page: r.keys?.[0] || '',
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))

    const perArticle = articles
      .map((a) => {
        const slug = toSlug(a.title)
        const match = slug
          ? pages.find((p) => p.page.toLowerCase().includes(`/${slug}`) || p.page.toLowerCase().endsWith(slug))
          : null
        return {
          id: a.id,
          title: a.title,
          slug,
          url: match?.page || null,
          publishedAt: a.publishedAt,
          clicks: match?.clicks || 0,
          impressions: match?.impressions || 0,
          ctr: match?.ctr || 0,
          position: match?.position || 0,
          matched: !!match,
        }
      })
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)

    // Top pages overall (whether or not they map to a tracked article).
    const topPages = [...pages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25)

    return res.status(200).json({
      property,
      range: { startDate, endDate, days },
      totals,
      trend,
      topQueries,
      topPages,
      perArticle,
      articleCount: articles.length,
      matchedCount: perArticle.filter((a) => a.matched).length,
    })
  } catch (e) {
    if (e?.message === 'not_connected') {
      return res.status(409).json({ error: 'not_connected', message: 'Google account not connected.' })
    }
    console.error('[insights/data] failed:', e?.message || e)
    return res.status(500).json({ error: 'gsc_query_failed', message: e?.message || 'Unknown error' })
  }
}
