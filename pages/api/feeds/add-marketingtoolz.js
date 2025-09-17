// Add marketing tools RSS feeds
export default async function handler(req, res) {
  try {
    const { saveFeedConfigs, getFeedConfigs } = require('../../../lib/feed-manager')

    console.log('Adding marketing tools feeds...')

    // Get current feeds
    const currentFeeds = await getFeedConfigs()

    const newMarketingFeeds = [
  // Nederlandse Marketing Feeds
  {
    id: 'marketing-tribune-nl',
    name: 'Marketing Tribune Nederland',
    url: 'https://www.marketingtribune.nl/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'frank-watching-nl',
    name: 'Frank Watching',
    url: 'https://www.frankwatching.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'marketing-facts-nl',
    name: 'Marketing Facts',
    url: 'https://www.marketingfacts.nl/rss',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'emerce-nl',
    name: 'Emerce',
    url: 'https://emerce.nl/rss.xml',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'marketing-online-nl',
    name: 'Marketing Online',
    url: 'https://www.marketingonline.nl/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'b2b-marketing-nl',
    name: 'B2B Marketing Nederland',
    url: 'https://www.b2bmarketing.nl/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'agentschap-nl',
    name: 'Agentschap Nederland',
    url: 'https://www.agentschapnl.nl/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },

  // Internationale Marketing Feeds
  {
    id: 'marketing-land',
    name: 'Marketing Land',
    url: 'https://feeds.feedburner.com/MarketingLand',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'content-marketing-institute',
    name: 'Content Marketing Institute',
    url: 'https://contentmarketinginstitute.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'hubspot-marketing-blog',
    name: 'HubSpot Marketing Blog',
    url: 'https://blog.hubspot.com/marketing/rss.xml',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'neil-patel',
    name: 'Neil Patel',
    url: 'https://neilpatel.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'copyblogger',
    name: 'Copyblogger',
    url: 'https://feeds.feedburner.com/copyblogger',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'marketing-insider-group',
    name: 'Marketing Insider Group',
    url: 'https://marketinginsidergroup.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'mark-growth',
    name: 'Mark Growth',
    url: 'https://blog.markgrowth.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },

  // AI Wetgeving & Regelgeving Feeds
  {
    id: 'europarl',
    name: 'European Parliament',
    url: 'https://www.europarl.europa.eu/news/en/rss/press-releases',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 20
  },
  {
    id: 'autoriteitpersoonsgegevens',
    name: 'Autoriteit Persoonsgegevens',
    url: 'https://www.autoriteitpersoonsgegevens.nl/rss.xml',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 20
  },
  {
    id: 'ec-digital-market',
    name: 'EC Digital Single Market',
    url: 'https://ec.europa.eu/digital-single-market/en/rss.xml',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 20
  },
  {
    id: 'government-nl',
    name: 'Government.nl',
    url: 'https://www.government.nl/rss/news',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 20
  },

  // AI Tech & Business Feeds
  {
    id: 'venturebeat-ai',
    name: 'VentureBeat AI',
    url: 'https://feeds.feedburner.com/venturebeat/SZYF',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'oreilly-radar',
    name: "O'Reilly Radar",
    url: 'https://feeds.feedburner.com/oreilly/radar',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'technology-review',
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'techcrunch-startups',
    name: 'TechCrunch Startups',
    url: 'https://feeds.feedburner.com/TechCrunch/startups',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'mashable',
    name: 'Mashable',
    url: 'https://feeds.mashable.com/Mashable',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  },
  {
    id: 'venturebeat-ai-specific',
    name: 'VentureBeat AI News',
    url: 'https://feeds.feedburner.com/venturebeat/ai',
    category: 'marketingtoolz',
    enabled: true,
    maxArticles: 30
  }
]

    // Filter out feeds that already exist
    const existingFeedIds = new Set(currentFeeds.map(feed => feed.id))
    const feedsToAdd = newMarketingFeeds.filter(feed => !existingFeedIds.has(feed.id))

    if (feedsToAdd.length === 0) {
      return res.status(200).json({
        message: 'All marketing feeds already exist',
        total: currentFeeds.length,
        added: 0
      })
    }

    console.log(`Adding ${feedsToAdd.length} new marketing feeds...`)

    // Combine existing feeds with new ones
    const allFeeds = [...currentFeeds, ...feedsToAdd]

    // Save all feeds
    await saveFeedConfigs(allFeeds)

    console.log('Marketing feeds added successfully')

    res.status(200).json({
      message: 'Marketing feeds added successfully',
      total: allFeeds.length,
      added: feedsToAdd.length,
      newFeeds: feedsToAdd.map(feed => ({ name: feed.name, category: feed.category }))
    })

  } catch (error) {
    console.error('Error adding marketing feeds:', error)
    res.status(500).json({
      message: 'Failed to add marketing feeds',
      error: error.message
    })
  }
}