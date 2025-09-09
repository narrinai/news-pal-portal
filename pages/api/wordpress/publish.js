// Simple WordPress publish without complex imports

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('WordPress publish API called')
    console.log('Request body keys:', Object.keys(req.body))
    
    const { articleId, wordpressHtml, title } = req.body

    if (!articleId || !wordpressHtml || !title) {
      console.log('Missing required fields:', { articleId: !!articleId, wordpressHtml: !!wordpressHtml, title: !!title })
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['articleId', 'wordpressHtml', 'title'],
        received: { articleId: !!articleId, wordpressHtml: !!wordpressHtml, title: !!title }
      })
    }

    // Check WordPress credentials
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const wpUsername = process.env.WORDPRESS_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD
    
    console.log('WordPress config:', {
      siteUrl: wpSiteUrl,
      hasUsername: !!wpUsername,
      hasPassword: !!wpPassword,
      passwordLength: wpPassword?.length || 0
    })

    if (!wpUsername || !wpPassword) {
      return res.status(500).json({ 
        error: 'WordPress not configured',
        message: 'WordPress credentials not found in environment variables',
        missing: {
          username: !wpUsername,
          password: !wpPassword
        }
      })
    }

    // Create WordPress API instance
    const wpAPI = createWordPressAPI()
    if (!wpAPI) {
      return res.status(500).json({ 
        error: 'WordPress not configured',
        message: 'WordPress credentials not found in environment variables'
      })
    }

    // Prepare post for custom post type "news"
    const wordpressPost = {
      title: title,
      content: wordpressHtml,
      status: 'draft', // Always create as draft
      excerpt: `Automatisch gegenereerd door News Pal Portal - ${new Date().toLocaleDateString('nl-NL')}`,
      meta: {
        'news_pal_source': true,
        'news_pal_article_id': articleId,
        'news_pal_generated': new Date().toISOString()
      }
    }

    console.log('Publishing to WordPress...')
    
    // Publish to WordPress custom post type "news"
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    
    const response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/news`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wordpressPost)
    })

    console.log('WordPress publish response status:', response.status)

    if (response.ok) {
      const createdPost = await response.json()
      console.log('WordPress post created:', createdPost.id)
      
      // Update article status in Airtable
      try {
        const { updateArticle } = require('../../../lib/airtable')
        await updateArticle(articleId, { 
          status: 'published',
          wordpressUrl: createdPost.link,
          wordpressPostId: createdPost.id?.toString()
        })
        console.log('Airtable updated successfully')
      } catch (airtableError) {
        console.error('Failed to update Airtable after WordPress publish:', airtableError)
        // Continue anyway - WordPress publish was successful
      }

      return res.status(200).json({
        success: true,
        message: 'Article published to WordPress News section as draft',
        wordpress: {
          postId: createdPost.id,
          postUrl: createdPost.link,
          postType: 'news',
          status: 'draft',
          editUrl: `${wpSiteUrl}/wp-admin/post.php?post=${createdPost.id}&action=edit`
        }
      })
    } else {
      const errorData = await response.text()
      console.error('WordPress API error:', response.status, errorData)
      return res.status(500).json({
        success: false,
        error: 'WordPress publish failed',
        details: `${response.status} - ${errorData}`,
        apiUrl: `${wpSiteUrl}/wp-json/wp/v2/news`
      })
    }

    if (publishResult.success) {
      // Update article status in Airtable
      try {
        await updateArticle(articleId, { 
          status: 'published',
          wordpressUrl: publishResult.postUrl,
          wordpressPostId: publishResult.postId
        })
      } catch (airtableError) {
        console.error('Failed to update Airtable after WordPress publish:', airtableError)
        // Continue anyway - WordPress publish was successful
      }

      return res.status(200).json({
        success: true,
        message: 'Article published to WordPress as draft in News section',
        wordpress: {
          postId: publishResult.postId,
          postUrl: publishResult.postUrl,
          category: newsCategory?.name || 'Default',
          status: 'draft'
        }
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'WordPress publish failed',
        details: publishResult.message
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