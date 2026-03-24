// HubSpot CMS Blog post publish
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { access_token, title, content_html, meta_description, featured_image_url, blog_id, status = 'DRAFT' } = req.body

  if (!access_token || !title || !content_html) {
    return res.status(400).json({ error: 'access_token, title and content_html are required' })
  }

  try {
    // Auto-discover blog ID if not provided
    let contentGroupId = blog_id
    if (!contentGroupId) {
      const blogsRes = await fetch('https://api.hubapi.com/cms/v3/blogs?limit=1', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (blogsRes.ok) {
        const data = await blogsRes.json()
        contentGroupId = data.results?.[0]?.id
      }
      if (!contentGroupId) {
        return res.status(400).json({ error: 'Geen HubSpot blog gevonden. Maak eerst een blog aan in HubSpot CMS.' })
      }
    }

    const postBody = {
      name: title,
      htmlTitle: title,
      postBody: content_html,
      contentGroupId,
      state: status,
    }
    if (meta_description) postBody.metaDescription = meta_description
    if (featured_image_url) {
      postBody.featuredImage = featured_image_url
      postBody.useFeaturedImage = true
    }

    const publishRes = await fetch('https://api.hubapi.com/cms/v3/blogs/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postBody),
    })

    if (publishRes.ok) {
      const created = await publishRes.json()
      return res.status(200).json({
        success: true,
        message: `Gepubliceerd in HubSpot${status === 'DRAFT' ? ' als concept' : ''}`,
        hubspot: {
          postId: created.id,
          postUrl: created.url,
          editUrl: `https://app.hubspot.com/content-editor/blog/${created.id}`,
        },
      })
    } else {
      const err = await publishRes.text()
      return res.status(500).json({
        success: false,
        message: `HubSpot publish mislukt (${publishRes.status})`,
        details: err,
      })
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: `Fout: ${error.message}` })
  }
}
