// WordPress publish with News category instead of custom post type
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('WordPress publish with category API called')
    const { articleId, wordpressHtml, title, wordPressSite } = req.body

    if (!articleId || !wordpressHtml || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields'
      })
    }

    // Get WordPress site configuration
    const siteConfig = wordPressSite || { 
      id: 'marketingtoolz', 
      url: 'https://www.marketingtoolz.nl' 
    }
    
    const wpSiteUrl = siteConfig.url || process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.nl'
    
    // Get site-specific credentials
    let wpUsername, wpPassword
    
    if (siteConfig.id === 'cybertijger') {
      wpUsername = process.env.CYBERTIJGER_USERNAME
      wpPassword = process.env.CYBERTIJGER_APP_PASSWORD
    } else {
      // Default to MarketingToolz credentials
      wpUsername = process.env.WORDPRESS_USERNAME
      wpPassword = process.env.WORDPRESS_APP_PASSWORD
    }
    
    console.log(`Publishing to WordPress site: ${siteConfig.name || wpSiteUrl} (${siteConfig.id})`)
    
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
          cat.slug === 'news' ||
          cat.slug === 'nieuws'
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
            name: 'Nieuws',
            slug: 'nieuws',
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

    // News post object with required ACF fields and proper URL structure
    const wordpressPost = {
      title: title,
      content: wordpressHtml,
      status: 'draft',
      slug: `nieuws-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`, // Custom slug with /nieuws/ prefix
      // ACF fields for News post type
      acf: {
        'nieuws_titel': title, // "Nieuws Titel" field from screenshot
        'sidebar_type': 'Nieuws', // Use 'Nieuws' (Dutch) as shown in screenshot dropdown
        'aantal_berichten_tonen': 5, // Number of posts to show
        'titel_boven_berichten': 'Laatste Nieuws' // Dutch title
      },
      // Meta fields backup
      meta: {
        'nieuws_titel': title,
        'sidebar_type': 'Nieuws', // Use 'Nieuws' (Dutch) 
        'aantal_berichten_tonen': 5,
        'titel_boven_berichten': 'Laatste Nieuws',
        '_nieuws_titel': title,
        '_sidebar_type': 'Nieuws'
      }
    }

    console.log('Publishing to News custom post type with ACF fields...')
    
    // First, let's discover what post types are available
    let postTypesResponse
    try {
      postTypesResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/types`, {
        headers: { 'Authorization': `Basic ${credentials}` }
      })
      if (postTypesResponse.ok) {
        const postTypes = await postTypesResponse.json()
        console.log('Available post types:', Object.keys(postTypes))
      }
    } catch (e) {
      console.log('Could not fetch post types:', e.message)
    }
    
    // News post type is theme-based and not REST-enabled
    // Use Posts with News category and extensive meta fields to mimic News post behavior
    console.log('Creating post in News category (theme-based News post type not REST accessible)...')
    
    let response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        content: wordpressHtml,
        status: 'draft',
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        // Try to force post type to News
        type: 'news',
        post_type: 'news',
        // Set language to Dutch  
        lang: 'nl',
        locale: 'nl_NL',
        format: 'standard',
        meta: {
          '_post_type': 'news', // Force News post type
          '_custom_post_type': 'news',
          '_nieuws_artikel': 'ja',
          '_origineel_van_newspal': 'true', 
          '_post_language': 'dutch',
          '_locale': 'nl_NL',
          // ACF fields for News post type
          'sidebar_type': 'Nieuws',
          '_sidebar_type': 'Nieuws',
          'field_sidebar_type': 'Nieuws',
          '_acf_sidebar_type': 'Nieuws',
          'aantal_berichten_tonen': 5,
          'titel_boven_berichten': 'Laatste Nieuws',
          'nieuws_titel': title
        }
      })
    })

    if (response.ok) {
      const createdPost = await response.json()
      
      // Log what actually got created
      console.log('Created post details:', {
        id: createdPost.id,
        link: createdPost.link,
        type: createdPost.type,
        categories: createdPost.categories
      })
      
      const actualPostType = createdPost.type || 'post'
      const successMessage = actualPostType === 'news' 
        ? 'Article published as News post type!' 
        : 'Article published in Posts with News category'
      
      return res.status(200).json({
        success: true,
        message: successMessage,
        wordpress: {
          postId: createdPost.id,
          postUrl: createdPost.link,
          postType: actualPostType,
          category: newsCategory?.name || 'News',
          editUrl: `${wpSiteUrl}/wp-admin/post.php?post=${createdPost.id}&action=edit&lang=nl`
        }
      })
    }
    
    const errorData = await response.text()
    console.error('WordPress Posts publish failed:', response.status, errorData)
    return res.status(response.status).json({
      error: 'WordPress publish failed',
      status: response.status,
      details: errorData,
      message: 'Failed to create post in News category'
    })

  } catch (error) {
    console.error('WordPress publish error:', error)
    return res.status(500).json({
      error: 'WordPress publish failed',
      details: error.message,
      stack: error.stack,
      requestBody: { articleId, title, hasSiteConfig: !!wordPressSite },
      environment: {
        hasUsername: !!wpUsername,
        hasPassword: !!wpPassword,
        siteUrl: wpSiteUrl
      }
    })
  }
}