// Publish a native WordPress post using per-automation credentials
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { site_url, username, app_password, title, content_html, excerpt, featured_image_url, tags, status = 'publish' } = req.body

  if (!site_url || !username || !app_password || !title || !content_html) {
    return res.status(400).json({ error: 'site_url, username, app_password, title and content_html are required' })
  }

  try {
    const base = site_url.replace(/\/$/, '')
    const credentials = Buffer.from(`${username}:${app_password}`).toString('base64')
    const headers = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    }

    // Optionally resolve tag IDs
    let tagIds = []
    if (tags && tags.length > 0) {
      try {
        for (const tag of tags.slice(0, 5)) {
          const encoded = encodeURIComponent(tag)
          // Try to find existing tag
          const searchRes = await fetch(`${base}/wp-json/wp/v2/tags?search=${encoded}&per_page=1`, { headers })
          if (searchRes.ok) {
            const found = await searchRes.json()
            if (found.length > 0) {
              tagIds.push(found[0].id)
            } else {
              // Create new tag
              const createRes = await fetch(`${base}/wp-json/wp/v2/tags`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: tag }),
              })
              if (createRes.ok) {
                const created = await createRes.json()
                tagIds.push(created.id)
              }
            }
          }
        }
      } catch { /* tag sync is non-critical */ }
    }

    const postBody = {
      title,
      content: content_html,
      status,
      excerpt: excerpt || '',
      ...(tagIds.length > 0 && { tags: tagIds }),
    }

    const response = await fetch(`${base}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(postBody),
    })

    if (response.ok) {
      const created = await response.json()
      return res.status(200).json({
        success: true,
        message: `Gepubliceerd op WordPress${status === 'draft' ? ' als concept' : ''}`,
        wordpress: {
          postId: created.id,
          postUrl: created.link,
          editUrl: `${base}/wp-admin/post.php?post=${created.id}&action=edit`,
        },
      })
    } else {
      const err = await response.text()
      return res.status(500).json({
        success: false,
        message: `WordPress publish mislukt (${response.status})`,
        details: err,
      })
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: `Fout: ${error.message}` })
  }
}
