// WordPress connection test using per-automation credentials
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { site_url, username, app_password } = req.body
  if (!site_url || !username || !app_password) {
    return res.status(400).json({ error: 'site_url, username and app_password are required' })
  }

  try {
    const base = site_url.replace(/\/$/, '')
    const credentials = Buffer.from(`${username}:${app_password}`).toString('base64')

    const response = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const userData = await response.json()
      return res.status(200).json({
        success: true,
        message: `Verbonden als "${userData.name}"`,
        wordpress: {
          username: userData.name,
          email: userData.email,
          roles: userData.roles,
        },
      })
    } else {
      const err = await response.text()
      return res.status(400).json({
        success: false,
        message: response.status === 401
          ? 'Ongeldige gebruikersnaam of Application Password'
          : `Verbinding mislukt (${response.status}) — controleer je WordPress URL`,
        details: err,
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Kan ${req.body.site_url} niet bereiken — controleer de URL`,
      details: error.message,
    })
  }
}
