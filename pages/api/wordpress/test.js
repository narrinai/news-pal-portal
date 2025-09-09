// Simple WordPress connection test
export default async function handler(req, res) {
  try {
    console.log('Testing WordPress connection...')
    
    // Check environment variables
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
    const wpUsername = process.env.WORDPRESS_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD
    
    const envStatus = {
      hasUsername: !!wpUsername,
      hasPassword: !!wpPassword,
      siteUrl: wpSiteUrl,
      usernameLength: wpUsername?.length || 0,
      passwordLength: wpPassword?.length || 0
    }
    
    console.log('Environment check:', envStatus)
    
    if (!wpUsername || !wpPassword) {
      return res.status(500).json({
        error: 'WordPress credentials missing',
        envStatus
      })
    }
    
    // Test basic WordPress API access
    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')
    console.log('Testing WordPress API...')
    
    const response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('WordPress API response status:', response.status)
    
    if (response.ok) {
      const userData = await response.json()
      console.log('WordPress connection successful')
      
      return res.status(200).json({
        success: true,
        message: 'WordPress connection successful',
        envStatus,
        wordpress: {
          username: userData.name,
          email: userData.email,
          roles: userData.roles
        }
      })
    } else {
      const errorText = await response.text()
      console.error('WordPress API error:', response.status, errorText)
      
      return res.status(500).json({
        error: 'WordPress API failed',
        status: response.status,
        details: errorText,
        envStatus
      })
    }
    
  } catch (error) {
    console.error('WordPress test error:', error)
    return res.status(500).json({
      error: 'WordPress test failed',
      details: error.message,
      stack: error.stack
    })
  }
}