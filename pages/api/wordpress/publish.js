// Clean WordPress publish API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('WordPress publish API called')
    const { articleId, wordpressHtml, title } = req.body

    if (!articleId || !wordpressHtml || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['articleId', 'wordpressHtml', 'title']
      })
    }

    // Check WordPress credentials
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const wpUsername = process.env.WORDPRESS_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD
    
    if (!wpUsername || !wpPassword) {
      return res.status(500).json({ 
        error: 'WordPress credentials not configured'
      })
    }

    // Prepare WordPress post
    const wordpressPost = {
      title: title,
      content: wordpressHtml,
      status: 'draft',
      excerpt: `Gegenereerd door News Pal Portal - ${new Date().toLocaleDateString('nl-NL')}`,
    }

    console.log('Publishing to WordPress News section...')
    
    // Publish to WordPress custom post type "news"
    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    
    // First try standard posts, then news custom post type
    const response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wordpressPost)
    })

    console.log('WordPress response:', response.status)

    if (response.ok) {
      const createdPost = await response.json()
      
      return res.status(200).json({
        success: true,
        message: 'Article published as draft in WordPress News section',
        wordpress: {
          postId: createdPost.id,
          postUrl: createdPost.link,
          editUrl: `${wpSiteUrl}/wp-admin/post.php?post=${createdPost.id}&action=edit`
        }
      })
    } else {
      const errorData = await response.text()
      console.error('WordPress publish failed:', response.status, errorData)
      return res.status(500).json({
        error: 'WordPress publish failed',
        status: response.status,
        details: errorData,
        endpoint: `${wpSiteUrl}/wp-json/wp/v2/posts`
      })
    }

  } catch (error) {
    console.error('WordPress publish error:', error)
    return res.status(500).json({
      error: 'WordPress publish failed',
      details: error.message
    })
  }
}