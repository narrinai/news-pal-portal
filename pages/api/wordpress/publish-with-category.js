// WordPress publish with News category instead of custom post type
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('WordPress publish with category API called')
    const { articleId, wordpressHtml, title } = req.body

    if (!articleId || !wordpressHtml || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields'
      })
    }

    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const wpUsername = process.env.WORDPRESS_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD
    
    if (!wpUsername || !wpPassword) {
      return res.status(500).json({ 
        error: 'WordPress credentials not configured'
      })
    }

    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    
    // First, get or create "News" category
    let newsCategory = null
    try {
      // Get all categories
      const categoriesResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/categories?per_page=100`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json()
        newsCategory = categories.find(cat => 
          cat.name.toLowerCase() === 'news' || 
          cat.name.toLowerCase() === 'nieuws' ||
          cat.slug === 'news'
        )
        console.log(`Found ${categories.length} categories, News category:`, newsCategory?.name || 'not found')
      }
      
      // Create News category if it doesn't exist
      if (!newsCategory) {
        console.log('Creating News category...')
        const createCategoryResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/categories`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'News',
            slug: 'news',
            description: 'Nieuws en updates van News Pal Portal'
          })
        })
        
        if (createCategoryResponse.ok) {
          newsCategory = await createCategoryResponse.json()
          console.log('News category created:', newsCategory.id)
        } else {
          console.error('Failed to create News category:', await createCategoryResponse.text())
        }
      }
    } catch (error) {
      console.error('Category management error:', error.message)
    }

    // Prepare WordPress post with News category and Dutch language
    const wordpressPost = {
      title: title,
      content: wordpressHtml,
      status: 'draft',
      categories: newsCategory ? [newsCategory.id] : [],
      excerpt: `Gegenereerd door News Pal Portal - ${new Date().toLocaleDateString('nl-NL')}`,
      // WPML language settings
      lang: 'nl',
      // Try to set post format (if your theme supports it)
      format: 'standard',
      meta: {
        '_wpml_language': 'nl'
      }
    }

    console.log('Publishing to standard posts with News category...')
    
    // Try custom post type 'news' first, fallback to posts
    let response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/news`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wordpressPost)
    })

    if (response.ok) {
      const createdPost = await response.json()
      
      return res.status(200).json({
        success: true,
        message: 'Article published as draft in WordPress News section',
        wordpress: {
          postId: createdPost.id,
          postUrl: createdPost.link,
          postType: 'news',
          editUrl: `${wpSiteUrl}/wp-admin/post.php?post=${createdPost.id}&action=edit&lang=nl`
        }
      })
    } else if (response.status === 404) {
      // Custom post type doesn't exist, try standard posts with News category
      console.log('News post type not found, trying standard posts with category...')
      
      response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...wordpressPost,
          categories: newsCategory ? [newsCategory.id] : []
        })
      })
      
      if (response.ok) {
        const createdPost = await response.json()
        return res.status(200).json({
          success: true,
          message: `Article published as draft in News category`,
          wordpress: {
            postId: createdPost.id,
            postUrl: createdPost.link,
            category: newsCategory?.name || 'Default',
            editUrl: `${wpSiteUrl}/wp-admin/post.php?post=${createdPost.id}&action=edit&lang=nl`
          }
        })
      }
    }
    
    const errorData = await response.text()
    console.error('Both news post type and standard posts failed:', response.status, errorData)
    return res.status(500).json({
      error: 'WordPress publish failed',
      status: response.status,
      details: errorData,
      attempted: ['wp/v2/news', 'wp/v2/posts']
    })

  } catch (error) {
    console.error('WordPress publish error:', error)
    return res.status(500).json({
      error: 'WordPress publish failed',
      details: error.message
    })
  }
}