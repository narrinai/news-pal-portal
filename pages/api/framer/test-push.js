export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { api_token, collection_slug } = req.body

  if (!api_token || !collection_slug) {
    return res.status(400).json({ error: 'Missing api_token or collection_slug' })
  }

  try {
    // First, get the collection ID from the slug
    const collectionsRes = await fetch('https://api.framer.com/v1/collections', {
      headers: { Authorization: `Bearer ${api_token}` },
    })

    if (!collectionsRes.ok) {
      const text = await collectionsRes.text().catch(() => '')
      return res.status(200).json({
        success: false,
        error: collectionsRes.status === 401
          ? 'Invalid API token — check your Framer CMS API token'
          : `Framer API returned ${collectionsRes.status}: ${text.slice(0, 200)}`,
      })
    }

    const collections = await collectionsRes.json()
    const collection = collections.collections?.find(c => c.slug === collection_slug)

    if (!collection) {
      return res.status(200).json({
        success: false,
        error: `Collection "${collection_slug}" not found. Available collections: ${collections.collections?.map(c => c.slug).join(', ') || 'none'}`,
      })
    }

    // Create a test item in the collection
    const testItem = {
      fieldData: {
        name: 'News Pal — Connection Successful!',
        slug: 'newspal-test-article',
        _draft: true, // Create as draft so it doesn't go live
      },
    }

    const createRes = await fetch(`https://api.framer.com/v1/collections/${collection.id}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_token}`,
      },
      body: JSON.stringify(testItem),
    })

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      return res.status(200).json({
        success: false,
        error: `Failed to create test item: ${createRes.status} ${text.slice(0, 200)}`,
      })
    }

    // Clean up: delete the test item
    const created = await createRes.json()
    if (created.id) {
      await fetch(`https://api.framer.com/v1/collections/${collection.id}/items/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${api_token}` },
      }).catch(() => {})
    }

    return res.status(200).json({
      success: true,
      message: 'Framer CMS connection verified',
      collection_id: collection.id,
      collection_name: collection.name,
    })
  } catch (error) {
    console.error('[FRAMER-TEST] Error:', error.message)
    return res.status(200).json({
      success: false,
      error: `Could not reach Framer API: ${error.message}`,
    })
  }
}
