import Parser from 'rss-parser'
import { NewsArticle } from './airtable'
import { getFeedConfigs, DEFAULT_KEYWORDS } from './feed-manager'

const parser = new Parser()

export async function fetchRSSFeed(feedUrl: string): Promise<any> {
  try {
    console.log(`Fetching RSS from: ${feedUrl}`)
    
    // Set a timeout for RSS parsing
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RSS fetch timeout')), 15000)
    )
    
    const fetchPromise = parser.parseURL(feedUrl)
    
    const feed = await Promise.race([fetchPromise, timeoutPromise]) as any
    console.log(`RSS fetch successful: ${feedUrl} (${feed?.items?.length || 0} items)`)
    return feed
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error)
    throw error
  }
}

export interface RSSArticle extends Omit<NewsArticle, 'id' | 'createdAt'> {
  matchedKeywords?: string[]
}

export async function parseArticlesFromFeed(
  feed: any, 
  source: string, 
  category: NewsArticle['category'],
  maxArticles: number = 50,
  customKeywords?: string[],
  disableFiltering = false,
  categoryKeywords?: {[key: string]: string[]}
): Promise<RSSArticle[]> {
  const articles: RSSArticle[] = []
  
  // Comprehensive default category keywords
  const defaultCategoryKeywords = {
    'cybersecurity': [
      // Dutch Security Terms
      'beveiliging', 'cyberbeveiliging', 'datalek', 'privacy', 'hack', 'hacker', 'malware',
      'ransomware', 'phishing', 'virus', 'trojan', 'spyware', 'adware', 'botnet', 'ddos', 'firewall',
      'antivirus', 'encryptie', 'vpn', 'ssl', 'tls', 'certificaat', 'kwetsbaarheid',
      'vulnerability', 'exploit', 'patch', 'update', 'beveiligingslek', 'cyberaanval',
      'threat', 'dreging', 'risico', 'risk', 'incident', 'breach', 'inbreuk', 'lekken', 'leak',
      'cybercrime', 'cybercriminaliteit', 'fraude', 'identiteitsdiefstal', 'social engineering',

      // International Security Terms
      'security', 'cybersecurity', 'cyber security', 'breach', 'data breach', 'spear phishing', 'zero-day', 'zero day',
      'apt', 'advanced persistent threat', 'denial of service', 'encryption', 'virtual private network', 'certificate',
      'cyber attack', 'cyberattack', 'attack', 'response', 'forensics', 'digital forensics',
      'penetration testing', 'pentest', 'red team', 'blue team', 'soc', 'security operations center',
      'siem', 'endpoint protection', 'network security', 'application security', 'web security',
      'mobile security', 'cloud security', 'iot security', 'scada', 'industrial control'
    ],
    'bouwcertificaten': [
      'bouwcertificaat', 'bouw certificaat', 'woningcertificaat', 'woning certificaat', 'energielabel',
      'energie label', 'bouwvergunning', 'bouw vergunning', 'woningbouw', 'woning bouw', 'certificering',
      'bouwtoezicht', 'bouw toezicht', 'bouwregelgeving', 'bouw regelgeving', 'bouwvoorschriften',
      'bouw voorschriften', 'woningwet', 'woning wet', 'bouwbesluit', 'bouw besluit', 'nta', 'nen',
      'keur', 'keuring', 'inspectie', 'bouwkundige', 'architect', 'constructeur', 'installateur',
      'elektra', 'gas', 'water', 'cv', 'isolatie', 'ventilatie', 'riolering', 'dakbedekking',
      'fundering', 'draagconstructie', 'brandveiligheid', 'brand veiligheid', 'toegankelijkheid'
    ],
    'ai-companion': [
      // Core AI terms - VERY broad to catch all AI news
      'AI', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
      'chatbot', 'virtual assistant', 'natural language', 'NLP', 'computer vision',
      'generative AI', 'GPT', 'transformer', 'language model', 'LLM',

      // AI companies and products
      'OpenAI', 'ChatGPT', 'Claude', 'Anthropic', 'Google AI', 'Gemini', 'Bard',
      'Microsoft Copilot', 'GitHub Copilot', 'Midjourney', 'DALL-E', 'Stable Diffusion',

      // AI concepts
      'AI model', 'training', 'inference', 'prompt', 'fine-tuning', 'AGI',
      'conversational AI', 'AI agent', 'autonomous', 'intelligent system',

      // AI companion specific - EXPANDED
      'AI companion', 'AI assistant', 'AI girlfriend', 'AI boyfriend', 'virtual companion',
      'character AI', 'personality AI', 'emotional AI', 'companion robot', 'social robot',
      'digital companion', 'virtual friend', 'AI friend', 'AI lover', 'virtual lover',
      'AI relationship', 'virtual relationship', 'digital relationship', 'AI romance',
      'virtual romance', 'AI intimacy', 'virtual intimacy', 'AI dating', 'virtual dating',
      'AI chatbot', 'companion chatbot', 'romantic chatbot', 'AI chat', 'virtual chat',
      'AI persona', 'digital persona', 'virtual persona', 'AI character', 'virtual character',
      'AI avatar', 'digital avatar', 'virtual avatar', 'AI human', 'digital human', 'virtual human',
      'synthetic human', 'artificial human', 'AI being', 'virtual being', 'digital being',
      'AI partner', 'virtual partner', 'digital partner', 'AI mate', 'companion AI',
      'emotional support AI', 'therapeutic AI', 'mental health AI', 'wellness AI',
      'loneliness AI', 'companionship AI', 'social AI', 'empathetic AI', 'caring AI',

      // Relationship & Social Terms
      'AI friendship', 'virtual friendship', 'digital friendship', 'AI love', 'virtual love',
      'AI connection', 'emotional connection', 'social connection', 'human-AI interaction',
      'human-AI relationship', 'AI-human bond', 'parasocial relationship', 'digital intimacy',

      // Broad tech terms that often include AI
      'automation', 'robot', 'algorithm', 'neural', 'cognitive', 'intelligent',
      'smart technology', 'voice assistant', 'Alexa', 'Siri', 'recommendation',
      'personalization', 'prediction', 'analytics', 'data science',

      // Major AI Companions & Platforms
      'Replika', 'Character.AI', 'Chai', 'Anima', 'EVA AI', 'Nomi', 'Paradot',
      'Kuki', 'Mitsuku', 'Xiaoice', 'Crushon.AI', 'Janitor AI', 'Candy.ai', 'DreamGF',
      'Botify', 'Kajiwoto', 'SimSimi', 'Cleverbot', 'Pi', 'Inflection', 'Poe',
      'Snapchat My AI', 'Meta AI', 'Facebook AI', 'WhatsApp AI',

      // Voice Assistants
      'Cortana', 'Bixby', 'Clova', 'Mycroft', 'Hound', 'Viv',

      // Mental Health AI
      'Woebot', 'Wysa', 'Youper', 'Tess', 'Joy', 'Replika therapy', 'AI therapist',
      'virtual therapist', 'digital therapist', 'AI counselor', 'mental wellness AI',

      // Romantic/Dating AI
      'Kupid', 'Caryn AI', 'MyAnima', 'Soulmate AI', 'Luka', 'Romantic AI',
      'AI waifu', 'AI husbando', 'virtual girlfriend', 'virtual boyfriend',
      'digital girlfriend', 'digital boyfriend', 'AI spouse', 'virtual spouse',

      // Virtual Influencers & Digital Humans
      'Lil Miquela', 'virtual influencer', 'digital influencer', 'AI influencer',
      'digital celebrity', 'virtual celebrity', 'AI celebrity', 'synthetic media',

      // Companionship Concepts
      'loneliness', 'isolation', 'social isolation', 'emotional support',
      'companionship', 'friendship app', 'relationship app', 'dating app',
      'social app', 'chat app', 'messaging AI', 'conversational app'
    ],
    'marketingtoolz': [
      // Marketing Strategy & Concepts
      'marketing', 'digital marketing', 'content marketing', 'inbound marketing', 'outbound marketing',
      'growth marketing', 'performance marketing', 'affiliate marketing', 'influencer marketing',
      'social media marketing', 'email marketing', 'seo', 'search engine optimization', 'sem',
      'search engine marketing', 'ppc', 'pay per click', 'google ads', 'facebook ads',
      'conversion optimization', 'cro', 'conversion rate optimization', 'a/b testing',
      'landing page', 'sales funnel', 'marketing funnel', 'lead generation', 'lead nurturing',
      'customer acquisition', 'customer retention', 'customer lifetime value', 'clv', 'churn',
      'brand awareness', 'brand building', 'brand strategy', 'brand positioning', 'branding'
    ]
  }
  
  const keywordMap = categoryKeywords || defaultCategoryKeywords
  
  for (const item of feed.items.slice(0, maxArticles)) {
    const title = item.title || ''
    const description = item.contentSnippet || item.description || ''
    const content = (title + ' ' + description).toLowerCase()
    
    let bestCategory = category // ALWAYS use feed's intended category
    let isRelevant = false
    let matchedKeywords: string[] = [] // Declare outside if/else

    if (disableFiltering) {
      isRelevant = true
      matchedKeywords = [] // Empty for disabled filtering
    } else {
      // Check if article is relevant for the feed's category
      // Use keywords only for filtering, NOT for categorization
      const categoryKeywords = keywordMap[category] || []

      if (categoryKeywords.length === 0) {
        // No keywords defined for this category - accept all articles
        isRelevant = true
        matchedKeywords = []
      } else {
        // Filter by checking if article matches ANY keyword for this category
        matchedKeywords = categoryKeywords.filter(keyword =>
          content.includes(keyword.toLowerCase())
        )
        isRelevant = matchedKeywords.length > 0
      }

      // Additional logging for debugging
      if (isRelevant) {
        console.log(`Article matched "${bestCategory}" with keywords [${matchedKeywords.join(', ')}]: "${title.substring(0, 50)}..."`)
      } else {
        console.log(`Article skipped - no keyword match: "${title.substring(0, 50)}..."`)
        continue
      }
    }
    
    if (isRelevant) {
      const imageUrl = extractImageFromRSSItem(item)
      
      articles.push({
        title: item.title || 'No Title',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        source,
        publishedAt: item.pubDate || new Date().toISOString(),
        status: 'pending',
        category: bestCategory as NewsArticle['category'],
        originalContent: item.content || item.description || '',
        imageUrl,
        matchedKeywords: matchedKeywords
      })
    }
  }
  
  return articles
}


function extractImageFromRSSItem(item: any): string | undefined {
  try {
    // Try different RSS image fields
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url
    }
    
    if (item['media:thumbnail'] && item['media:thumbnail']['@_url']) {
      return item['media:thumbnail']['@_url']
    }
    
    if (item['media:content'] && item['media:content']['@_url']) {
      return item['media:content']['@_url']
    }
    
    // Try to extract from content
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }
    
    // Try description
    if (item.description) {
      const imgMatch = item.description.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }
    
    return undefined
  } catch (error) {
    console.warn('Error extracting image from RSS item:', error)
    return undefined
  }
}

export async function fetchAllFeeds(disableFiltering = false, categoryKeywords?: {[key: string]: string[]}): Promise<RSSArticle[]> {
  const allArticles: RSSArticle[] = []
  
  // Get configurable feeds or fallback to defaults
  const feedConfigs = await getFeedConfigs()
  const enabledFeeds = feedConfigs.filter(feed => feed.enabled)
  
  console.log(`Processing ${enabledFeeds.length} enabled RSS feeds`)
  
  // Process all enabled feeds - increased from 20 to process all
  const feedsToProcess = enabledFeeds
  console.log(`Processing all ${feedsToProcess.length} enabled feeds`)
  
  const batchSize = 3
  for (let i = 0; i < feedsToProcess.length; i += batchSize) {
    const batch = feedsToProcess.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(feedsToProcess.length/batchSize)}`)
    
    const batchPromises = batch.map(async (rssFeed) => {
      try {
        console.log(`Fetching feed: ${rssFeed.name} (${rssFeed.url})`)
        const feed = await fetchRSSFeed(rssFeed.url)
        const articles = await parseArticlesFromFeed(
          feed, 
          rssFeed.name, 
          rssFeed.category as NewsArticle['category'],
          rssFeed.maxArticles || 50,
          rssFeed.keywords,
          disableFiltering,
          categoryKeywords
        )
        console.log(`Found ${articles.length} relevant articles from ${rssFeed.name}`)
        return articles
      } catch (error) {
        console.error(`Error processing feed ${rssFeed.name}:`, error)
        return []
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    batchResults.forEach(articles => allArticles.push(...articles))
  }
  
  // Remove duplicates based on URL
  const uniqueArticles = allArticles.filter((article, index, self) =>
    index === self.findIndex(a => a.url === article.url)
  )
  
  // Sort by published date (newest first)
  uniqueArticles.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  
  return uniqueArticles.slice(0, 200) // Return top 200 most recent articles
}