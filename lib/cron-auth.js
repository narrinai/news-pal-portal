/**
 * Auth for cron endpoints that are ALSO triggerable from the dashboard UI.
 *
 * Two callers are legitimate:
 *  - schedulers (Netlify scheduled functions, Vercel cron) → Bearer CRON_SECRET
 *  - a logged-in dashboard user clicking a button → `authenticated=true` cookie,
 *    the same session cookie middleware.ts checks for /dashboard pages.
 *
 * The cookie is HttpOnly + SameSite=Lax (see pages/api/auth/login.js), so a
 * cross-site POST never carries it.
 */
export function isAuthorizedCronRequest(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const auth = req.headers?.authorization
  if (auth === `Bearer ${secret}`) return true

  // Pages-router API routes parse cookies for us; fall back to the raw header
  // for callers (Netlify functions) that hand us a plainer request object.
  const cookieValue =
    req.cookies?.authenticated ??
    (typeof req.headers?.cookie === 'string'
      ? req.headers.cookie.match(/(?:^|;\s*)authenticated=([^;]*)/)?.[1]
      : undefined)

  return cookieValue === 'true'
}
