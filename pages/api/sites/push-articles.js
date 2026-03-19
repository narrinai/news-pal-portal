import { getAutomation, getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { automation_id } = req.body

  if (!automation_id) {
    return res.status(400).json({ error: 'Missing automation_id' })
  }

  try {
    const automation = await getAutomation(automation_id)
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' })
    }

    if (!automation.site_url || !automation.site_api_key || automation.site_platform !== 'replit') {
      return res.status(200).json({ success: false, error: 'No Replit site configured' })
    }

    // Get all published articles for this automation
    const allArticles = await getArticles()
    const publishedArticles = allArticles
      .filter(a => a.automation_id === automation_id && a.status === 'published')
      .map(a => ({
        id: a.id,
        slug: (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
        title: a.title,
        description: (a.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim() + ((a.description || '').length > 200 ? '...' : ''),
        content_html: a.content_html || a.content_rewritten || `<p>${(a.description || '').replace(/<[^>]+>/g, '')}</p>`,
        category: { 'cybersecurity': 'Security', 'ai-companion': 'AI', 'ai-learning': 'AI', 'marketingtoolz': 'Marketing', 'europeanpurpose': 'European Tech', 'bouwcertificaten': 'Construction' }[a.category] || a.category,
        source: a.source,
        sourceUrl: a.url,
        imageUrl: a.imageUrl || `https://placehold.co/1200x630/4f46e5/ffffff?text=${encodeURIComponent((a.title || 'Article').substring(0, 30))}`,
        subtitle: a.subtitle || '',
        publishedAt: a.publishedAt,
        faq: a.faq || null,
      }))

    if (publishedArticles.length === 0) {
      return res.status(200).json({ success: true, pushed: 0, message: 'No published articles to push' })
    }

    const origin = new URL(automation.site_url).origin
    const pushUrl = `${origin}/newspal/receive`

    const pushRes = await fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-newspal-key': automation.site_api_key,
      },
      body: JSON.stringify({ articles: publishedArticles }),
    })

    const data = await pushRes.json().catch(() => ({}))

    if (!pushRes.ok) {
      return res.status(200).json({
        success: false,
        error: `Site returned ${pushRes.status}`,
      })
    }

    return res.status(200).json({
      success: true,
      pushed: data.received || publishedArticles.length,
      total: data.total || 0,
    })
  } catch (error) {
    console.error('[push-articles] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: error.message,
    })
  }
}
