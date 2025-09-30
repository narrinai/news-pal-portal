// Efficient Article Management System
// Only selected articles are stored in Airtable

import { fetchAllFeeds } from './rss-parser'
import { getArticles, createArticle, NewsArticle } from './airtable'

export interface LiveArticle {
  // RSS data (temporary, not stored)
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  category: string
  originalContent: string
  imageUrl?: string
  matchedKeywords?: string[] // Keywords that caused this article to be included
  
  // Status tracking
  isSelected?: boolean // If true, it's in Airtable
  airtableId?: string // ID from Airtable if selected
}

// In-memory cache for RSS articles
let rssCache: LiveArticle[] = []
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes - shorter cache for testing

export async function getLiveArticles(disableFiltering = false): Promise<{
  pending: LiveArticle[]  // From RSS feeds (not in Airtable)
  selected: NewsArticle[] // From Airtable
  rewritten: NewsArticle[]
  published: NewsArticle[]
}> {
  try {
    // Get fresh RSS data if cache is stale
    const now = Date.now()
    if (rssCache.length === 0 || (now - lastFetchTime) > CACHE_DURATION) {
      console.log('Fetching fresh RSS data...')
      
      // Load category keywords from settings
      let categoryKeywords = {}
      try {
        // Import settings directly to avoid API call in server context
        const settings = {
          'cybersecurity': [
            // Dutch Security Terms
            'beveiliging', 'cyberbeveiliging', 'datalek', 'privacy', 'hack', 'hacker', 'malware', 
            'ransomware', 'phishing', 'virus', 'trojan', 'spyware', 'adware', 'botnet', 'ddos', 'firewall',
            'antivirus', 'encryptie', 'vpn', 'ssl', 'tls', 'certificaat', 'kwetsbaarheid',
            'vulnerability', 'exploit', 'patch', 'update', 'beveiligingslek', 'cyberaanval', 
            'threat', 'dreging', 'risico', 'risk', 'incident', 'breach', 'inbreuk', 'lekken', 'leak',
            'cybercrime', 'cybercriminaliteit', 'fraude', 'identiteitsdiefstal', 'social engineering',
            'twee-factor', 'authenticatie', 'wachtwoord', 'password', 'biometric', 'toegangscontrole',
            'gdpr', 'avg', 'compliance', 'audit', 'pentesting', 'ethisch hacken', 'white hat', 'black hat',
            
            // International Security Terms
            'security', 'cybersecurity', 'cyber security', 'breach', 'data breach', 'spear phishing', 'zero-day', 'zero day',
            'apt', 'advanced persistent threat', 'denial of service', 'encryption', 'virtual private network', 'certificate',
            'cyber attack', 'cyberattack', 'attack', 'response', 'forensics', 'digital forensics',
            'penetration testing', 'pentest', 'red team', 'blue team', 'soc', 'security operations center',
            'siem', 'endpoint protection', 'network security', 'application security', 'web security',
            'mobile security', 'cloud security', 'iot security', 'scada', 'industrial control',
            'identity theft', 'fraud', 'phishing email', 'worm', 'rootkit', 'backdoor', 'keylogger',
            'c2', 'command control', 'cve', 'cvss', 'nist', 'iso 27001',
            'risk assessment', 'threat intelligence', 'threat hunting', 'incident response', 'disaster recovery',
            'business continuity', 'backup', 'authorization', 'access control', 'iam',
            'multifactor', 'credential', 'privilege escalation', 'lateral movement',
            
            // Cybersecurity Certifications
            'cissp', 'ccsp', 'sscp', 'csslp', 'hcispp', 'cgrc', 'cisa', 'cism', 'crisc', 'cgeit', 'cdpse',
            'cobit', 'cobit-di', 'ceh', 'chfi', 'cpent', 'cnd', 'cciso', 'ecih', 'security+', 'cysa+', 'pentest+', 'casp+',
            'gsec', 'gcih', 'gcia', 'gpen', 'gwapt', 'gcfe', 'gcfa', 'oscp', 'oswe', 'osep', 'osed', 'oswp',
            'sc-200', 'sc-300', 'sc-400', 'sc-100', 'az-500', 'aws-security', 'gcp-security',
            'cyberops associate', 'cyberops professional', 'ccnp security', 'ccie security',
            'cipp/e', 'cipm', 'cipt', 'isfs', 'iso27001-la', 'iso27001-li', 'iso27701', 'itil4', 'itil4-mp/sl',
            'certified ethical hacker', 'certified information systems auditor', 'certified information security manager',
            'certified information systems security professional', 'certified cloud security professional',
            'offensive security certified professional', 'comptia security', 'giac security', 'sans institute'
          ],
          'bouwcertificaten': [
            'bouwcertificaat', 'bouw certificaat', 'woningcertificaat', 'woning certificaat', 'energielabel',
            'energie label', 'bouwvergunning', 'bouw vergunning', 'woningbouw', 'woning bouw', 'certificering',
            'bouwtoezicht', 'bouw toezicht', 'bouwregelgeving', 'bouw regelgeving', 'bouwvoorschriften',
            'bouw voorschriften', 'woningwet', 'woning wet', 'bouwbesluit', 'bouw besluit', 'nta', 'nen',
            'keur', 'keuring', 'inspectie', 'bouwkundige', 'architect', 'constructeur', 'installateur',
            'elektra', 'gas', 'water', 'cv', 'isolatie', 'ventilatie', 'riolering', 'dakbedekking',
            'fundering', 'draagconstructie', 'brandveiligheid', 'brand veiligheid', 'toegankelijkheid',
            'milieu', 'duurzaamheid', 'energiezuinig', 'energie zuinig', 'warmtepomp', 'zonnepanelen',
            'isolatieglas', 'kierdichting', 'thermische', 'prestatie', 'epc', 'woningwaardering'
          ],
          'ai-companion': [
            'AI companion', 'AI assistant', 'AI girlfriend', 'AI boyfriend', 'virtual assistant', 'virtual companion',
            'conversational AI', 'character AI', 'personality AI', 'emotional AI',
            'companion robot', 'social robot', 'humanoid robot', 'synthetic human', 'digital human',
            'virtual character', 'AI friend', 'AI relationship', 'digital companion', 'virtual being',
            'artificial companion', 'robot companion', 'AI chat companion', 'emotional support AI',
            'therapeutic AI', 'mental health AI', 'loneliness AI', 'AI therapy companion',
            'replika', 'character.ai', 'xiaoice', 'romantic AI', 'dating AI', 'intimacy AI'
          ],
          'ai-learning': [
            'AI learning', 'artificial intelligence learning', 'machine learning', 'deep learning', 'neural networks',
            'AI education', 'AI training', 'AI tutorial', 'AI course', 'AI certification', 'AI bootcamp',
            'learn AI', 'study AI', 'AI curriculum', 'AI pedagogy', 'educational AI', 'AI literacy',
            'data science', 'data analytics', 'big data', 'statistics', 'algorithms', 'programming',
            'python AI', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
            'computer vision', 'natural language processing', 'reinforcement learning', 'supervised learning',
            'unsupervised learning', 'semi-supervised', 'transfer learning', 'federated learning',
            'AI research', 'AI paper', 'AI publication', 'AI conference', 'AI workshop', 'AI seminar',
            'AI university', 'AI degree', 'AI masters', 'AI phd', 'AI professor', 'AI student',
            'coding bootcamp', 'online learning', 'mooc', 'coursera', 'udacity', 'edx', 'khan academy',
            'AI skills', 'AI career', 'AI job', 'AI developer', 'AI engineer', 'data scientist',
            'ml engineer', 'ai specialist', 'prompt engineering', 'fine-tuning', 'model training'
          ],
          'marketingtoolz': [
            // Marketing Strategy & Concepts
            'marketing', 'digital marketing', 'content marketing', 'inbound marketing', 'outbound marketing',
            'growth marketing', 'performance marketing', 'affiliate marketing', 'influencer marketing',
            'social media marketing', 'email marketing', 'seo', 'search engine optimization', 'sem',
            'search engine marketing', 'ppc', 'pay per click', 'google ads', 'facebook ads',
            'instagram marketing', 'linkedin marketing', 'twitter marketing', 'tiktok marketing',
            'youtube marketing', 'video marketing', 'podcast marketing', 'webinar marketing',
            'conversion optimization', 'cro', 'conversion rate optimization', 'a/b testing',
            'landing page', 'sales funnel', 'marketing funnel', 'lead generation', 'lead nurturing',
            'customer acquisition', 'customer retention', 'customer lifetime value', 'clv', 'churn',
            'brand awareness', 'brand building', 'brand strategy', 'brand positioning', 'branding',
            'market research', 'customer insights', 'buyer persona', 'target audience', 'segmentation',
            'personalization', 'marketing automation', 'drip campaign', 'nurture campaign',
            'omnichannel', 'multichannel', 'cross-channel', 'attribution', 'marketing attribution',

            // Marketing Tools & Platforms
            'mailchimp', 'hubspot', 'marketo', 'pardot', 'salesforce marketing cloud', 'activecampaign',
            'convertkit', 'constant contact', 'aweber', 'getresponse', 'klaviyo', 'drip',
            'google analytics', 'google tag manager', 'facebook pixel', 'hotjar', 'mixpanel',
            'amplitude', 'segment', 'optimizely', 'unbounce', 'leadpages', 'clickfunnels',
            'wordpress', 'shopify', 'magento', 'woocommerce', 'squarespace', 'wix',
            'canva', 'figma', 'adobe creative', 'photoshop', 'illustrator', 'after effects',
            'buffer', 'hootsuite', 'sprout social', 'later', 'socialbakers', 'brandwatch',
            'mention', 'buzzsumo', 'ahrefs', 'semrush', 'moz', 'screaming frog', 'yoast',
            'zapier', 'ifttt', 'microsoft power automate', 'slack', 'trello', 'asana', 'notion',
            'typeform', 'surveymonkey', 'calendly', 'acuity scheduling', 'zoom', 'loom',
            'intercom', 'zendesk', 'freshworks', 'drift', 'chatbot', 'live chat',

            // AI & MarTech Innovation
            'martech', 'marketing technology', 'marketing stack', 'mar tech stack', 'cdp',
            'customer data platform', 'dmp', 'data management platform', 'crm integration',
            'api integration', 'webhook', 'marketing apis', 'no-code', 'low-code',
            'artificial intelligence marketing', 'ai marketing', 'machine learning marketing',
            'predictive analytics', 'behavioral analytics', 'real-time personalization',
            'dynamic content', 'recommendation engine', 'chatgpt marketing', 'ai copywriting',
            'ai content generation', 'automated content', 'programmatic advertising',
            'rtb', 'real-time bidding', 'header bidding', 'ad exchange', 'dsp', 'ssp',

            // Metrics & Analytics
            'kpi', 'roi', 'return on investment', 'roas', 'return on ad spend', 'cpc', 'cpm', 'ctr',
            'click through rate', 'open rate', 'bounce rate', 'conversion rate', 'cost per lead',
            'cost per acquisition', 'customer acquisition cost', 'cac', 'ltv', 'mrr',
            'monthly recurring revenue', 'arr', 'annual recurring revenue', 'cohort analysis',
            'retention rate', 'engagement rate', 'reach', 'impressions', 'frequency',
            'attribution modeling', 'multi-touch attribution', 'first-touch', 'last-touch',
            'utm tracking', 'campaign tracking', 'cross-device tracking', 'privacy compliance',
            'gdpr', 'ccpa', 'cookie consent', 'first-party data', 'zero-party data', 'third-party cookies'
          ]
        }
        categoryKeywords = settings
      } catch (error) {
        console.warn('Using default category keywords')
      }
      
      const rssArticles = await fetchAllFeeds(disableFiltering, categoryKeywords)
      
      // Convert to LiveArticle format
      rssCache = rssArticles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        category: article.category,
        originalContent: article.originalContent || '',
        imageUrl: article.imageUrl,
        matchedKeywords: (article as any).matchedKeywords || [],
        isSelected: false
      }))
      
      lastFetchTime = now
      console.log(`RSS cache updated with ${rssCache.length} articles`)
    }

    // Get all articles from Airtable (only selected/rewritten/published)
    const airtableArticles = await getArticles()
    const airtableUrls = new Set(airtableArticles.map(a => a.url))

    // Mark RSS articles as selected if they exist in Airtable
    const pendingArticles = rssCache
      .filter(article => !airtableUrls.has(article.url))
      .map(article => ({ ...article, isSelected: false }))

    const selectedArticles = airtableArticles.filter(a => a.status === 'selected')
    const rewrittenArticles = airtableArticles.filter(a => a.status === 'rewritten')  
    const publishedArticles = airtableArticles.filter(a => a.status === 'published')

    return {
      pending: pendingArticles.slice(0, 200), // Increased limit for more articles
      selected: selectedArticles,
      rewritten: rewrittenArticles,
      published: publishedArticles
    }
  } catch (error) {
    console.error('Error getting live articles:', error)
    throw error
  }
}

export async function selectArticle(article: LiveArticle): Promise<NewsArticle> {
  try {
    // Save to Airtable when selected
    const airtableArticle: Omit<NewsArticle, 'id' | 'createdAt'> = {
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
      status: 'selected',
      category: article.category as NewsArticle['category'],
      originalContent: article.originalContent,
      imageUrl: article.imageUrl
    }

    const created = await createArticle(airtableArticle)
    console.log(`Article selected and saved to Airtable: ${article.title}`)
    
    return {
      id: created.id,
      ...airtableArticle,
      createdAt: created.fields.createdAt as string
    }
  } catch (error) {
    console.error('Error selecting article:', error)
    throw error
  }
}

export function refreshRSSCache(): void {
  // Force refresh RSS cache
  rssCache = []
  lastFetchTime = 0
  console.log('RSS cache cleared - will refresh on next fetch with new categorization logic')
}

export function forceRSSRefresh(): void {
  // Immediate refresh without cache
  rssCache = []
  lastFetchTime = 0
  console.log('RSS cache force cleared - immediate refresh')
}

export function getCacheStatus(): { 
  articleCount: number
  lastUpdate: Date | null 
  isStale: boolean 
} {
  const now = Date.now()
  const isStale = (now - lastFetchTime) > CACHE_DURATION
  
  return {
    articleCount: rssCache.length,
    lastUpdate: lastFetchTime > 0 ? new Date(lastFetchTime) : null,
    isStale
  }
}