import { getArticles } from '../../../lib/airtable'
import { doRewrite } from '../../../lib/do-rewrite'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, options, customInstructions } = req.body;

    console.log('Rewrite request:', { id, options, hasCustomInstructions: !!customInstructions })

    // Verify article exists before dispatching work
    const articles = await getArticles()
    const article = articles.find(a => a.id === id)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Dispatch to the Netlify Background Function (15-min timeout) so the AI
    // rewrite reliably runs to completion and the result is written to Airtable.
    // On Vercel (or local without `netlify dev`) the background URL won't respond
    // as a 202 — fall back to running the rewrite inline.
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const host = req.headers.host || 'localhost:3000'
    const bgUrl = `${proto}://${host}/.netlify/functions/rewrite-background`

    try {
      const bgRes = await fetch(bgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
        body: JSON.stringify({ id, options, customInstructions }),
      })

      // Background functions return 202 Accepted on Netlify
      if (bgRes.status === 202) {
        console.log('[rewrite] Dispatched to background function')
        return res.status(202).json({ success: true, started: true, message: 'Rewrite started in background', articleId: id })
      }
      console.warn(`[rewrite] Background dispatch unexpected status ${bgRes.status}, falling back to inline`)
    } catch (err) {
      console.warn('[rewrite] Background dispatch failed, falling back to inline:', err.message)
    }

    // Fallback: run the rewrite inline (Vercel / local dev).
    try {
      const rewritten = await doRewrite(id, options, customInstructions)
      return res.status(200).json({
        success: true,
        rewritten: {
          title: rewritten.title,
          subtitle: rewritten.subtitle,
          content: rewritten.content,
          content_html: rewritten.content_html,
          faq: rewritten.faq,
          focus_keyword: rewritten.focus_keyword,
          meta_description: rewritten.meta_description,
          seo_keywords: rewritten.seo_keywords
        }
      })
    } catch (error) {
      console.error('[rewrite] Inline rewrite failed:', error)
      return res.status(500).json({ error: 'Rewrite failed', details: error.message })
    }
  } catch (error) {
    console.error('Error in rewrite handler:', error)
    return res.status(500).json({ error: 'Failed to start rewrite', details: error.message })
  }
}
