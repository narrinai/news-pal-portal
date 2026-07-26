import { exchangeCodeForTokens } from '../../../../lib/gsc'

// Google redirects back here with ?code=... after the user grants consent.
export default async function handler(req, res) {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`/dashboard/insights?error=${encodeURIComponent(String(error))}`)
  }
  if (!code) {
    return res.redirect('/dashboard/insights?error=missing_code')
  }

  // Verify CSRF state against the cookie set in auth.js
  const cookies = Object.fromEntries(
    (req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent))
  )
  if (!state || cookies.gsc_oauth_state !== state) {
    return res.redirect('/dashboard/insights?error=state_mismatch')
  }

  try {
    await exchangeCodeForTokens(String(code))
    res.setHeader('Set-Cookie', 'gsc_oauth_state=; Path=/; HttpOnly; Max-Age=0')
    return res.redirect('/dashboard/insights?connected=1')
  } catch (e) {
    console.error('[GSC callback] token exchange failed:', e?.message || e)
    return res.redirect(`/dashboard/insights?error=${encodeURIComponent(e?.message || 'token_exchange_failed')}`)
  }
}
