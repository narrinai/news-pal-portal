import { createWordPressAPI } from '../../../lib/wordpress-api'
import { updateArticle } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { articleId, wordpressHtml, title } = req.body

    if (!articleId || !wordpressHtml || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['articleId', 'wordpressHtml', 'title']
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

    // Publish to WordPress custom post type "news"
    const response = await fetch(`${process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'}/wp-json/wp/v2/news`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wordpressPost)
    })

    if (response.ok) {
      const createdPost = await response.json()
      
      // Update article status in Airtable
      try {
        await updateArticle(articleId, { 
          status: 'published',
          wordpressUrl: createdPost.link,
          wordpressPostId: createdPost.id?.toString()
        })
      } catch (airtableError) {
        console.error('Failed to update Airtable after WordPress publish:', airtableError)
      }

      return res.status(200).json({
        success: true,
        message: 'Article published to WordPress News section as draft',
        wordpress: {
          postId: createdPost.id,
          postUrl: createdPost.link,
          postType: 'news',
          status: 'draft',
          editUrl: `https://www.marketingtoolz.com/wp-admin/post.php?post=${createdPost.id}&action=edit`
        }
      })
    } else {
      const errorData = await response.text()
      return res.status(500).json({
        success: false,
        error: 'WordPress publish failed',
        details: `${response.status} - ${errorData}`
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