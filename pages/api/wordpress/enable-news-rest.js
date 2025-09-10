// Enable News post type REST API via CPT UI plugin
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { wordPressSite } = req.body
    
    // Get WordPress site configuration
    const siteConfig = wordPressSite || { 
      id: 'marketingtoolz', 
      url: 'https://www.marketingtoolz.nl' 
    }
    
    const wpSiteUrl = siteConfig.url
    
    // Get site-specific credentials
    let wpUsername, wpPassword
    
    if (siteConfig.id === 'cybertijger') {
      wpUsername = process.env.CYBERTIJGER_USERNAME
      wpPassword = process.env.CYBERTIJGER_APP_PASSWORD
    } else {
      wpUsername = process.env.WORDPRESS_USERNAME
      wpPassword = process.env.WORDPRESS_APP_PASSWORD
    }
    
    if (!wpUsername || !wpPassword) {
      return res.status(500).json({ 
        error: 'WordPress credentials not configured'
      })
    }

    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    
    console.log('Attempting to enable News post type REST API...')
    
    // Try to update News post type via WordPress admin-ajax
    const formData = new URLSearchParams({
      'action': 'cptui_process_post_type',
      'cpt_custom_post_type[name]': 'news',
      'cpt_custom_post_type[label]': 'News',
      'cpt_custom_post_type[singular_label]': 'News Item', 
      'cpt_custom_post_type[show_in_rest]': 'true',
      'cpt_custom_post_type[rest_base]': 'news',
      'cpt_custom_post_type[rest_controller_class]': 'WP_REST_Posts_Controller',
      'cpt_custom_post_type[public]': 'true',
      'cpt_custom_post_type[publicly_queryable]': 'true',
      'cpt_custom_post_type[show_ui]': 'true',
      'cpt_custom_post_type[show_in_menu]': 'true',
      'cpt_custom_post_type[supports][title]': 'true',
      'cpt_custom_post_type[supports][editor]': 'true',
      'cpt_custom_post_type[supports][custom-fields]': 'true',
      'cpt_submit': 'Update Post Type'
    })
    
    const updateResponse = await fetch(`${wpSiteUrl}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `wordpress_logged_in_auth=${credentials}`
      },
      body: formData
    })
    
    console.log('CPTUI update response:', updateResponse.status)
    
    if (updateResponse.ok) {
      // Try to flush rewrite rules
      const flushResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2`, {
        method: 'GET',
        headers: { 'Authorization': `Basic ${credentials}` }
      })
      
      return res.status(200).json({
        success: true,
        message: 'News post type REST API enabled via CPTUI',
        details: 'You can now use /wp-json/wp/v2/news endpoint'
      })
    } else {
      const errorText = await updateResponse.text()
      return res.status(500).json({
        error: 'Failed to update News post type',
        details: errorText
      })
    }
    
  } catch (error) {
    console.error('Error enabling News REST API:', error)
    return res.status(500).json({
      error: 'Failed to enable News REST API',
      details: error.message
    })
  }
}