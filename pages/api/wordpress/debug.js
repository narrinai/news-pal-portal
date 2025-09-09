// Debug WordPress REST API endpoints
export default async function handler(req, res) {
  try {
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const wpUsername = process.env.WORDPRESS_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD
    
    if (!wpUsername || !wpPassword) {
      return res.status(500).json({ error: 'WordPress credentials missing' })
    }

    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    
    console.log('Debugging WordPress REST API...')
    
    // Step 1: Check available post types
    const postTypesResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/types`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    })
    
    const postTypes = postTypesResponse.ok ? await postTypesResponse.json() : {}
    console.log('Available post types:', Object.keys(postTypes))
    
    // Step 2: Check if 'news' post type exists and is accessible
    let newsPostTypeInfo = null
    if (postTypes.news) {
      newsPostTypeInfo = {
        name: postTypes.news.name,
        slug: postTypes.news.slug,
        rest_base: postTypes.news.rest_base,
        supports: postTypes.news.supports
      }
    }
    
    // Step 3: Test actual post creation endpoints
    const endpointsToTest = [
      `${wpSiteUrl}/wp-json/wp/v2/news`,
      `${wpSiteUrl}/wp-json/wp/v2/posts`
    ]
    
    const endpointTests = []
    for (const endpoint of endpointsToTest) {
      try {
        const testResponse = await fetch(endpoint, {
          method: 'OPTIONS', // Just check if endpoint exists
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        })
        
        endpointTests.push({
          endpoint,
          status: testResponse.status,
          accessible: testResponse.ok,
          allowedMethods: testResponse.headers.get('allow') || 'unknown'
        })
      } catch (error) {
        endpointTests.push({
          endpoint,
          status: 'error',
          accessible: false,
          error: error.message
        })
      }
    }
    
    return res.status(200).json({
      success: true,
      wordpress: {
        siteUrl: wpSiteUrl,
        username: wpUsername
      },
      postTypes: Object.keys(postTypes),
      newsPostType: newsPostTypeInfo,
      endpointTests,
      recommendations: {
        hasNewsPostType: !!postTypes.news,
        newsRestEnabled: !!(postTypes.news?.rest_base),
        preferredEndpoint: postTypes.news?.rest_base ? `/wp-json/wp/v2/${postTypes.news.rest_base}` : '/wp-json/wp/v2/posts'
      }
    })
    
  } catch (error) {
    console.error('WordPress debug error:', error)
    return res.status(500).json({
      error: 'WordPress debug failed',
      details: error.message
    })
  }
}