// HubSpot connection test
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: 'access_token is required' })

  try {
    const response = await fetch('https://api.hubapi.com/cms/v3/blogs?limit=1', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      const blog = data.results?.[0]
      return res.status(200).json({
        success: true,
        message: blog
          ? `Verbonden — blog "${blog.name}" gevonden`
          : 'Verbonden (nog geen blog aangemaakt in HubSpot)',
        blog: blog ? { id: blog.id, name: blog.name, url: blog.absoluteUrl } : null,
      })
    } else {
      const err = await response.text()
      return res.status(400).json({
        success: false,
        message: `Verbinding mislukt (${response.status}) — controleer je access token`,
        details: err,
      })
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: `Fout: ${error.message}` })
  }
}
