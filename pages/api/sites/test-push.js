export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { site_url, site_api_key } = req.body

  if (!site_url || !site_api_key) {
    return res.status(400).json({ error: 'Missing site_url or site_api_key' })
  }

  try {
    // Derive the push endpoint from the site URL
    const origin = new URL(site_url).origin
    const pushUrl = `${origin}/newspal/receive`

    const testArticle = {
      id: 'test_' + Date.now(),
      slug: 'newspal-test-article',
      title: 'News Pal — Connection Successful!',
      description: 'This is a test article from News Pal. If you can see this, your connection is working perfectly.',
      content_html: '<p>This is a test article sent from News Pal to verify the connection with your Replit site.</p><p>When the auto-pipeline runs, real articles will be pushed here automatically — rewritten in your preferred style and language.</p><p>You can delete this test article from your <code>newspal-articles.json</code> file.</p>',
      category: 'test',
      source: 'News Pal',
      sourceUrl: 'https://newspal.vercel.app',
      imageUrl: '',
      subtitle: 'Your Replit site is connected and ready to receive articles',
      publishedAt: new Date().toISOString(),
      faq: null,
    }

    const pushRes = await fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-newspal-key': site_api_key,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': origin,
      },
      body: JSON.stringify({ articles: [testArticle] }),
    })

    if (!pushRes.ok) {
      const text = await pushRes.text().catch(() => '')
      return res.status(200).json({
        success: false,
        error: pushRes.status === 401
          ? 'API key rejected — check that the NEWSPAL_API_KEY secret in Replit matches'
          : `Replit returned ${pushRes.status}: ${text.slice(0, 200)}`,
      })
    }

    const data = await pushRes.json().catch(() => ({}))
    return res.status(200).json({
      success: true,
      message: 'Test article pushed successfully',
      received: data.received,
      total: data.total,
    })
  } catch (error) {
    console.error('[TEST-PUSH] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: `Could not reach your Replit site. Make sure it's running and the URL is correct. (${error.message})`,
    })
  }
}
