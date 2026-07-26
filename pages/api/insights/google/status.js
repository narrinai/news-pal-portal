import { isConfigured, isConnected, listSites, disconnect } from '../../../../lib/gsc'

// GET  → { configured, connected, sites: [...] }
// POST { action: 'disconnect' } → clears the stored refresh token
export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (req.body?.action === 'disconnect') {
      await disconnect()
      return res.status(200).json({ connected: false })
    }
    return res.status(400).json({ error: 'Unknown action' })
  }

  const configured = isConfigured()
  if (!configured) return res.status(200).json({ configured: false, connected: false, sites: [] })

  const connected = await isConnected()
  if (!connected) return res.status(200).json({ configured: true, connected: false, sites: [] })

  try {
    const sites = await listSites()
    return res.status(200).json({ configured: true, connected: true, sites })
  } catch (e) {
    if (e?.message === 'not_connected') {
      return res.status(200).json({ configured: true, connected: false, sites: [] })
    }
    console.error('[GSC status] listSites failed:', e?.message || e)
    return res.status(200).json({ configured: true, connected: true, sites: [], error: e?.message || 'listSites_failed' })
  }
}
