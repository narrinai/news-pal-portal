// Force add all marketing feeds permanently
export default async function handler(req, res) {
  try {
    const { saveFeedConfigs, getFeedConfigs } = require('../../../lib/feed-manager')

    console.log('Force adding all marketing feeds...')

    // Get current feeds first
    const currentFeeds = await getFeedConfigs()
    console.log('Current feeds count:', currentFeeds.length)

    const allMarketingFeeds = [
      // Nederlandse Marketing Feeds
      {
        id: 'marketing-tribune-nl',
        url: 'https://www.marketingtribune.nl/feed/',
        name: 'Marketing Tribune Nederland',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'frank-watching-nl',
        url: 'https://www.frankwatching.com/feed/',
        name: 'Frank Watching',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'marketing-facts-nl',
        url: 'https://www.marketingfacts.nl/rss',
        name: 'Marketing Facts',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'emerce-nl',
        url: 'https://emerce.nl/rss.xml',
        name: 'Emerce',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'marketing-online-nl',
        url: 'https://www.marketingonline.nl/feed/',
        name: 'Marketing Online',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'b2b-marketing-nl',
        url: 'https://www.b2bmarketing.nl/feed/',
        name: 'B2B Marketing Nederland',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'agentschap-nl',
        url: 'https://www.agentschapnl.nl/feed/',
        name: 'Agentschap Nederland',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },

      // Internationale Marketing Feeds
      {
        id: 'marketing-land',
        url: 'https://feeds.feedburner.com/MarketingLand',
        name: 'Marketing Land',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'content-marketing-institute',
        url: 'https://contentmarketinginstitute.com/feed/',
        name: 'Content Marketing Institute',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'hubspot-marketing-blog',
        url: 'https://blog.hubspot.com/marketing/rss.xml',
        name: 'HubSpot Marketing Blog',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'neil-patel',
        url: 'https://neilpatel.com/feed/',
        name: 'Neil Patel',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'copyblogger',
        url: 'https://feeds.feedburner.com/copyblogger',
        name: 'Copyblogger',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'marketing-insider-group',
        url: 'https://marketinginsidergroup.com/feed/',
        name: 'Marketing Insider Group',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },

      // AI Tech & Business Feeds
      {
        id: 'venturebeat-ai',
        url: 'https://feeds.feedburner.com/venturebeat/SZYF',
        name: 'VentureBeat AI',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'techcrunch',
        url: 'https://techcrunch.com/feed/',
        name: 'TechCrunch',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'oreilly-radar',
        url: 'https://feeds.feedburner.com/oreilly/radar',
        name: "O'Reilly Radar",
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'technology-review',
        url: 'https://www.technologyreview.com/feed/',
        name: 'MIT Technology Review',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'techcrunch-startups',
        url: 'https://feeds.feedburner.com/TechCrunch/startups',
        name: 'TechCrunch Startups',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'the-verge',
        url: 'https://www.theverge.com/rss/index.xml',
        name: 'The Verge',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },
      {
        id: 'venturebeat-ai-specific',
        url: 'https://feeds.feedburner.com/venturebeat/ai',
        name: 'VentureBeat AI News',
        category: 'marketingtoolz',
        enabled: true,
        maxArticles: 30
      },

      // Keep existing cybersecurity feeds
      {
        id: 'hackernews-persistent',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        name: 'The Hacker News',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'tweakers-persistent',
        url: 'https://feeds.feedburner.com/tweakers/mixed',
        name: 'Tweakers',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'security-nl-persistent',
        url: 'https://www.security.nl/rss/headlines.xml',
        name: 'Security.NL',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      },
      {
        id: 'krebs-persistent',
        url: 'https://krebsonsecurity.com/feed/',
        name: 'Krebs on Security',
        category: 'cybersecurity',
        enabled: true,
        maxArticles: 50
      }
    ]

    // Force save all feeds - this will replace any existing feeds
    await saveFeedConfigs(allMarketingFeeds)

    console.log(`Forcefully saved ${allMarketingFeeds.length} feeds (${allMarketingFeeds.filter(f => f.category === 'marketingtoolz').length} marketing + ${allMarketingFeeds.filter(f => f.category === 'cybersecurity').length} cybersecurity)`)

    res.status(200).json({
      success: true,
      message: 'All marketing feeds forcefully added',
      total: allMarketingFeeds.length,
      marketingtoolz: allMarketingFeeds.filter(f => f.category === 'marketingtoolz').length,
      cybersecurity: allMarketingFeeds.filter(f => f.category === 'cybersecurity').length,
      feeds: allMarketingFeeds.map(feed => ({ id: feed.id, name: feed.name, category: feed.category }))
    })

  } catch (error) {
    console.error('Error forcing marketing feeds:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to force add marketing feeds',
      error: error.message
    })
  }
}