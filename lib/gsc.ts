// Google Search Console client — talks to the GSC REST API directly via fetch
// (no heavy `googleapis` dependency). OAuth refresh token is stored in the
// `app_config` Airtable table under the key `gsc_refresh_token`.

import { getConfig, setConfig } from './airtable'

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GSC_BASE = 'https://www.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const REFRESH_TOKEN_KEY = 'gsc_refresh_token'

export function isConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REDIRECT_URI)
}

// Step 1 of OAuth: URL the user is redirected to for consent.
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',      // needed to receive a refresh_token
    prompt: 'consent',           // force refresh_token even on re-auth
    include_granted_scopes: 'true',
    state,
  })
  return `${OAUTH_AUTH_URL}?${params.toString()}`
}

// Step 2 of OAuth: exchange the authorization code for tokens, persist the refresh token.
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`)
  if (!data.refresh_token) {
    throw new Error('No refresh_token returned. Revoke prior access at myaccount.google.com and reconnect.')
  }
  await setConfig(REFRESH_TOKEN_KEY, data.refresh_token)
}

export async function isConnected(): Promise<boolean> {
  return !!(await getConfig(REFRESH_TOKEN_KEY))
}

export async function disconnect(): Promise<void> {
  await setConfig(REFRESH_TOKEN_KEY, '')
}

// Access tokens are short-lived; cache in module memory until ~1 min before expiry.
let cachedAccessToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token
  }
  const refreshToken = await getConfig(REFRESH_TOKEN_KEY)
  if (!refreshToken) throw new Error('not_connected')

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    // invalid_grant = refresh token revoked/expired → force reconnect
    if (data.error === 'invalid_grant') { cachedAccessToken = null; throw new Error('not_connected') }
    throw new Error(`Token refresh failed: ${data.error_description || data.error || res.status}`)
  }
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 }
  return cachedAccessToken.token
}

// List the GSC properties the connected account has access to.
export async function listSites(): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const token = await getAccessToken()
  const res = await fetch(`${GSC_BASE}/sites`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(`listSites failed: ${data.error?.message || res.status}`)
  return (data.siteEntry || []).map((s: any) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }))
}

export interface SearchAnalyticsRow {
  keys?: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

// Query the Search Analytics API for a property.
export async function querySearchAnalytics(
  siteUrl: string,
  body: {
    startDate: string
    endDate: string
    dimensions?: string[]
    rowLimit?: number
    dimensionFilterGroups?: any[]
  }
): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken()
  const res = await fetch(`${GSC_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowLimit: 1000, ...body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`searchAnalytics failed: ${data.error?.message || res.status}`)
  return data.rows || []
}
