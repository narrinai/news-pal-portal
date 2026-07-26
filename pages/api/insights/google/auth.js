import { isConfigured, buildAuthUrl } from '../../../../lib/gsc'

// Kicks off the Google OAuth consent flow (redirects the browser to Google).
export default async function handler(req, res) {
  if (!isConfigured()) {
    return res.status(500).json({
      error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI.',
    })
  }
  // Lightweight CSRF state; verified in the callback via cookie round-trip.
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  res.setHeader('Set-Cookie', `gsc_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
  res.redirect(buildAuthUrl(state))
}
