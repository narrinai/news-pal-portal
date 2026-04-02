// Tag-to-feed/keyword mapping system
// Maps user-friendly tags to existing feed categories, feed IDs, and filter keywords

export interface TagMapping {
  category: string        // backward-compat link to existing category system
  feeds: string[]         // feed IDs from DEFAULT_RSS_FEEDS
  keywords: string[]      // filter keywords
}

// Each existing category maps 1:1 as a tag (backward compat)
// New tags can reference the same underlying feeds with different keyword filters
export const TAG_MAPPINGS: Record<string, TagMapping> = {
  // === Cybersecurity ===
  'cybersecurity': {
    category: 'cybersecurity',
    feeds: [
      'security-nl-default', 'tweakers', 'nu-tech', 'hackernews', 'krebs',
      'securityweek', 'threatpost', 'darkreading', 'bleepingcomputer', 'csoonline',
      'rss-app-cybersecurity', 'rss-app-new-cybersecurity'
    ],
    keywords: [
      'security', 'cybersecurity', 'hack', 'breach', 'malware', 'ransomware',
      'phishing', 'vulnerability', 'exploit', 'zero-day', 'ddos', 'firewall',
      'encryption', 'data breach', 'cyber attack', 'threat', 'privacy',
      'beveiliging', 'cyberbeveiliging', 'datalek', 'kwetsbaarheid', 'aanval'
    ]
  },
  'ransomware': {
    category: 'cybersecurity',
    feeds: ['hackernews', 'krebs', 'securityweek', 'bleepingcomputer', 'darkreading'],
    keywords: ['ransomware', 'ransom', 'extortion', 'lockbit', 'blackcat', 'encryption attack']
  },
  'data privacy': {
    category: 'cybersecurity',
    feeds: ['security-nl-default', 'securityweek', 'csoonline', 'bleepingcomputer'],
    keywords: ['privacy', 'gdpr', 'data protection', 'data breach', 'datalek', 'avg', 'personal data']
  },

  // === AI & Companions ===
  'ai companion': {
    category: 'ai-companion',
    feeds: [
      'techcrunch-ai', 'ars-technica-ai', 'wired-ai', 'wired-ai-specific',
      'theverge-ai', 'mit-tech-review', 'venturebeat-ai', 'zdnet-ai',
      'artificialintelligence-news', 'unite-ai'
    ],
    keywords: [
      'AI companion', 'AI girlfriend', 'AI boyfriend', 'AI romance', 'AI relationship',
      'virtual companion', 'Replika', 'Character.AI', 'Chai AI', 'Nomi AI',
      'roleplay AI', 'NSFW AI', 'emotional AI', 'companion chatbot'
    ]
  },
  'ai chatbot': {
    category: 'ai-companion',
    feeds: [
      'techcrunch-ai', 'theverge-ai', 'venturebeat-ai', 'zdnet-ai',
      'artificialintelligence-news', 'marktechpost'
    ],
    keywords: [
      'chatbot', 'ChatGPT', 'Claude', 'Gemini', 'conversational AI',
      'AI assistant', 'language model', 'LLM', 'GPT'
    ]
  },
  'ai news': {
    category: 'ai-companion',
    feeds: [
      'techcrunch-ai', 'ars-technica-ai', 'wired-ai-specific', 'theverge-ai',
      'mit-tech-review', 'venturebeat-ai', 'aiweekly', 'deepmind-blog',
      'openai-research', 'anthropic-news', 'ai-news-mit', 'zdnet-ai',
      'forbes-ai', 'artificialintelligence-news', 'marktechpost', 'unite-ai'
    ],
    keywords: [
      'artificial intelligence', 'AI', 'machine learning', 'deep learning',
      'neural network', 'GPT', 'LLM', 'generative AI', 'foundation model'
    ]
  },

  // === Marketing ===
  'email marketing': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai'],
    keywords: [
      'email marketing', 'newsletter', 'email automation', 'mailchimp',
      'hubspot', 'sendinblue', 'brevo', 'email campaign', 'drip campaign',
      'email list', 'open rate', 'click rate', 'email deliverability'
    ]
  },
  'seo': {
    category: 'marketingtoolz',
    feeds: ['searchenginejournal', 'searchengineland', 'martech-org', 'reuters-marketing', 'techcrunch-ai', 'zdnet-ai', 'forbes-ai', 'ars-technica-ai'],
    keywords: [
      'seo', 'search engine optimization', 'google ranking', 'organic traffic',
      'keyword research', 'backlink', 'serp', 'search algorithm', 'core web vitals',
      'technical seo', 'on-page seo', 'off-page seo', 'ai search', 'geo', 'sge'
    ]
  },
  'seo tools': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'zdnet-ai', 'forbes-ai', 'venturebeat-ai'],
    keywords: [
      'seo tool', 'seo software', 'ahrefs', 'semrush', 'moz', 'screaming frog',
      'seo audit', 'keyword tool', 'rank tracker', 'seo platform'
    ]
  },
  'content marketing': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai', 'forbes-ai'],
    keywords: [
      'content marketing', 'content strategy', 'blogging', 'copywriting',
      'content creation', 'storytelling', 'brand content', 'thought leadership'
    ]
  },
  'content creation': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'theverge-ai', 'forbes-ai'],
    keywords: [
      'content creation', 'content tool', 'writing tool', 'ai writing', 'ai copywriting',
      'jasper', 'copy.ai', 'grammarly', 'content generator', 'ai content'
    ]
  },
  'social media marketing': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai', 'forbes-ai', 'theverge-ai'],
    keywords: [
      'social media', 'instagram', 'tiktok', 'linkedin', 'facebook ads',
      'social media marketing', 'influencer', 'social advertising', 'engagement'
    ]
  },
  'marketing automation': {
    category: 'marketingtoolz',
    feeds: ['reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai'],
    keywords: [
      'marketing automation', 'hubspot', 'marketo', 'salesforce', 'crm',
      'lead scoring', 'workflow automation', 'marketing platform', 'pardot'
    ]
  },
  'ai marketing tools': {
    category: 'marketingtoolz',
    feeds: ['techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai', 'theverge-ai', 'artificialintelligence-news', 'reuters-marketing', 'bbc-marketing'],
    keywords: [
      'ai marketing', 'ai tool', 'marketing tool', 'ai software', 'marketing software',
      'ai-powered', 'marketing ai', 'generative ai marketing', 'ai analytics'
    ]
  },
  'marketing software': {
    category: 'marketingtoolz',
    feeds: ['techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai', 'reuters-marketing', 'bbc-marketing'],
    keywords: [
      'marketing software', 'marketing platform', 'saas marketing', 'martech',
      'marketing technology', 'marketing stack', 'marketing tool'
    ]
  },
  'ai tools': {
    category: 'marketingtoolz',
    feeds: ['techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai', 'theverge-ai', 'artificialintelligence-news', 'marktechpost', 'unite-ai', 'wired-ai-specific'],
    keywords: [
      'ai tool', 'ai software', 'ai app', 'ai platform', 'ai-powered',
      'machine learning tool', 'ai productivity', 'ai automation'
    ]
  },
  'ai copywriting': {
    category: 'marketingtoolz',
    feeds: ['techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai', 'artificialintelligence-news'],
    keywords: [
      'ai copywriting', 'ai writing', 'jasper', 'copy.ai', 'writesonic',
      'ai content', 'gpt writing', 'ai text generator', 'ai blog'
    ]
  },
  'marketing': {
    category: 'marketingtoolz',
    feeds: [
      'hubspot-blog', 'searchenginejournal', 'searchengineland', 'martech-org',
      'contentmarketinginstitute', 'socialmediaexaminer', 'marketingbrew', 'adweek', 'digiday',
      'reuters-marketing', 'techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai'
    ],
    keywords: [
      'marketing', 'digital marketing', 'growth marketing', 'performance marketing',
      'conversion', 'lead generation', 'customer acquisition', 'branding',
      'advertising', 'ppc', 'google ads', 'marketing automation', 'crm',
      'marketing tools', 'martech', 'marketing stack'
    ]
  },
  'marketing-ai': {
    category: 'marketing-ai',
    feeds: [
      'hubspot-blog', 'martech-org', 'contentmarketinginstitute', 'marketingbrew', 'adweek', 'digiday',
      'techcrunch-ai', 'venturebeat-ai', 'zdnet-ai', 'forbes-ai'
    ],
    keywords: [
      'ai marketing', 'marketing ai', 'ai tools', 'ai content', 'ai copywriting',
      'chatgpt marketing', 'ai automation', 'generative ai marketing',
      'ai analytics', 'predictive marketing', 'ai personalization',
      'marketing software', 'marketing platform', 'marketing tool'
    ]
  },
  'marketing-tools': {
    category: 'marketing-ai',
    feeds: [
      'hubspot-blog', 'martech-org', 'searchenginejournal', 'practicalecommerce',
      'techcrunch-ai', 'venturebeat-ai', 'producthunt'
    ],
    keywords: [
      'marketing tool', 'marketing software', 'marketing platform', 'saas marketing',
      'hubspot', 'mailchimp', 'semrush', 'ahrefs', 'hootsuite', 'buffer',
      'marketing automation', 'email marketing', 'crm', 'analytics tool'
    ]
  },

  // === European Tech ===
  'european tech': {
    category: 'europeanpurpose',
    feeds: [
      'techeu', 'sifted-eu', 'tnw-european', 'euractiv-digital',
      'techcrunch-europe', 'ars-technica-eu', 'tweakers-eu'
    ],
    keywords: [
      'european alternative', 'eu tech', 'digital sovereignty', 'european cloud',
      'european software', 'digital markets act', 'digital services act', 'gaia-x',
      'gdpr', 'european ai', 'made in europe'
    ]
  },
  'open source': {
    category: 'europeanpurpose',
    feeds: ['opensource-eu', 'nextcloud-blog', 'tnw-european', 'ars-technica-eu'],
    keywords: [
      'open source', 'self-hosted', 'nextcloud', 'libreoffice', 'onlyoffice',
      'collabora', 'foss', 'free software', 'open-source alternative'
    ]
  },
  'privacy tools': {
    category: 'europeanpurpose',
    feeds: ['proton-blog', 'opensource-eu', 'euractiv-digital'],
    keywords: [
      'privacy', 'proton', 'tutanota', 'tresorit', 'mullvad', 'vivaldi',
      'ecosia', 'startpage', 'qwant', 'privacy-first', 'encrypted'
    ]
  },

  // === E-commerce & Retail ===
  'ecommerce': {
    category: 'marketingtoolz',
    feeds: [
      'reuters-marketing', 'bbc-marketing', 'techcrunch-ai', 'venturebeat-ai',
      'forbes-ai', 'zdnet-ai', 'theverge-ai',
      'de-heise-news', 'de-golem', 'de-t3n', 'de-handelsblatt', 'de-manager-magazin'
    ],
    keywords: [
      'ecommerce', 'e-commerce', 'online shop', 'webshop', 'marketplace',
      'shopify', 'woocommerce', 'magento', 'online retail', 'conversion rate',
      'checkout', 'cart abandonment', 'product listing'
    ]
  },
  'pricing': {
    category: 'retail-pricing',
    feeds: [
      'retail-dive', 'modern-retail', 'retailwire', 'retail-touchpoints',
      'price-intelligently', 'competera-blog',
      'techcrunch-ai', 'venturebeat-ai', 'forbes-ai', 'zdnet-ai',
      'de-handelsblatt', 'de-manager-magazin', 'de-t3n', 'de-lebensmittelzeitung'
    ],
    keywords: [
      'pricing', 'price optimization', 'dynamic pricing', 'repricing',
      'price intelligence', 'competitive pricing', 'price monitoring',
      'revenue management', 'price strategy', 'yield management',
      'pricing software', 'pricing tools', 'price elasticity',
      'markdown optimization', 'promotional pricing', 'price war',
      'Preisgestaltung', 'Preisoptimierung', 'dynamische Preise', 'Preisstrategie'
    ]
  },
  'retail': {
    category: 'retail-pricing',
    feeds: [
      'retail-dive', 'grocery-dive', 'modern-retail', 'retailwire', 'retail-touchpoints',
      'de-lebensmittelzeitung',
      'techcrunch-ai', 'venturebeat-ai', 'forbes-ai', 'reuters-marketing',
      'de-handelsblatt', 'de-manager-magazin', 'de-t3n', 'de-heise-news'
    ],
    keywords: [
      'retail', 'retail technology', 'retail tech', 'omnichannel',
      'brick and mortar', 'point of sale', 'inventory management',
      'supply chain', 'fulfillment', 'last mile delivery',
      'grocery', 'supermarket', 'ecommerce', 'Einzelhandel', 'Lebensmittelhandel'
    ]
  },

  // === German Tech & News ===
  'german tech': {
    category: 'german-tech',
    feeds: [
      'de-heise-news', 'de-golem', 'de-t3n', 'de-spiegel-tech', 'de-chip', 'de-computerwoche',
      // International English feeds also work — the rewriter translates to German
      'techcrunch-ai', 'theverge-ai', 'ars-technica-ai', 'wired-ai', 'zdnet-ai'
    ],
    keywords: [
      'Technologie', 'Tech', 'Software', 'Hardware', 'Digital', 'IT', 'KI',
      'technology', 'software', 'hardware', 'digital', 'artificial intelligence'
    ]
  },
  'german news': {
    category: 'german-news',
    feeds: [
      'de-heise-news', 'de-golem', 'de-spiegel-tech', 'de-chip',
      // International English feeds also work — the rewriter translates to German
      'hackernews', 'techcrunch-ai', 'theverge-ai'
    ],
    keywords: [
      'Nachrichten', 'News', 'Neuigkeiten', 'Bericht', 'Meldung',
      'news', 'report', 'breaking'
    ]
  },
  'german business': {
    category: 'german-business',
    feeds: [
      'de-handelsblatt', 'de-manager-magazin', 'de-computerwoche',
      // International English feeds also work — the rewriter translates to German
      'techcrunch-ai', 'wired-ai'
    ],
    keywords: [
      'Wirtschaft', 'Business', 'Unternehmen', 'Markt', 'Finanzen', 'Startup',
      'business', 'market', 'company', 'startup', 'finance', 'economy'
    ]
  },
  'ki': {
    category: 'german-tech',
    feeds: [
      'de-heise-news', 'de-golem', 'de-t3n',
      'techcrunch-ai', 'theverge-ai', 'venturebeat-ai', 'mit-tech-review'
    ],
    keywords: [
      'KI', 'Künstliche Intelligenz', 'maschinelles Lernen', 'neuronales Netz',
      'AI', 'artificial intelligence', 'machine learning'
    ]
  },

  // === Bouw ===
  'bouwcertificaten': {
    category: 'bouwcertificaten',
    feeds: ['tweakers-bouw', 'computable', 'iculture'],
    keywords: [
      'bouwcertificaat', 'energielabel', 'bouwvergunning', 'woningbouw',
      'certificering', 'bouwtoezicht', 'bouwregelgeving', 'woningwet',
      'isolatie', 'ventilatie', 'brandveiligheid'
    ]
  },
}

/**
 * Given a list of tags, returns merged feeds, keywords, and categories
 */
export function discoverFromTags(tags: string[]): {
  feeds: string[]
  keywords: string[]
  categories: string[]
} {
  const feedSet = new Set<string>()
  const keywordSet = new Set<string>()
  const categorySet = new Set<string>()

  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim()
    // Exact match first
    const exact = TAG_MAPPINGS[normalized]
    if (exact) {
      exact.feeds.forEach(f => feedSet.add(f))
      exact.keywords.forEach(k => keywordSet.add(k))
      categorySet.add(exact.category)
      continue
    }
    // Fuzzy: check if tag contains a mapping key or vice versa
    for (const [key, mapping] of Object.entries(TAG_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        mapping.feeds.forEach(f => feedSet.add(f))
        mapping.keywords.forEach(k => keywordSet.add(k))
        categorySet.add(mapping.category)
      }
    }
  }

  return {
    feeds: Array.from(feedSet),
    keywords: Array.from(keywordSet),
    categories: Array.from(categorySet),
  }
}

/**
 * Returns all available tag names
 */
export function getAvailableTags(): string[] {
  return Object.keys(TAG_MAPPINGS)
}
