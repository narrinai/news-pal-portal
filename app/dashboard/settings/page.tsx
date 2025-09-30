'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../../components/NotificationSystem'
import Logo from '../../../components/Logo'

interface Settings {
  categories: string[]
  categoryKeywords: {
    [category: string]: string[]
  }
  rewriteInstructions: {
    general: string
    professional: string
    engaging: string
    technical: string
    news: string
  }
  rssFeeds: {
    id: string
    url: string
    name: string
    category: string
    enabled: boolean
    maxArticles?: number
  }[]
}

export default function SettingsPage() {
  const { showNotification, showConfirm, showPrompt } = useNotifications()
  const [settings, setSettings] = useState<Settings>({
    categories: ['cybersecurity', 'bouwcertificaten', 'ai-companion', 'ai-learning', 'marketingtoolz'],
    categoryKeywords: {
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
        'chatbot', 'chat bot', 'conversational AI', 'character AI', 'personality AI', 'emotional AI',
        'companion robot', 'social robot', 'humanoid', 'android', 'synthetic human', 'digital human',
        'avatar', 'virtual character', 'AI friend', 'AI relationship', 'digital companion', 'virtual being',
        'artificial companion', 'robot companion', 'AI chat', 'AI conversation', 'AI therapy',
        'therapeutic AI', 'mental health AI', 'wellness AI', 'emotional support', 'loneliness',
        'social isolation', 'human-AI interaction', 'anthropomorphic', 'empathy AI', 'emotional intelligence',
        'natural language processing', 'nlp', 'speech recognition', 'voice synthesis', 'text to speech',
        'voice assistant', 'alexa', 'siri', 'google assistant', 'cortana', 'replika', 'xiaoice',
        'romantic AI', 'dating AI', 'relationship AI', 'intimacy AI', 'companionship technology'
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
        'marketing tool', 'marketingtool', 'marketing software', 'marketing platform', 'marketing automation',
        'email marketing', 'social media marketing', 'content marketing', 'digital marketing', 'online marketing',
        'seo tool', 'analytics tool', 'conversion optimization', 'a/b testing', 'landing page',
        'crm', 'customer relationship management', 'lead generation', 'sales funnel', 'marketing funnel',
        'influencer marketing', 'affiliate marketing', 'performance marketing', 'growth hacking', 'growth marketing',
        'marketing metrics', 'roi marketing', 'marketing dashboard', 'marketing analytics', 'campaign management',
        'brand marketing', 'brand awareness', 'customer acquisition', 'customer retention', 'customer engagement',
        'marketing strategy', 'marketing tactics', 'marketing trends', 'martech', 'marketing technology',
        'paid advertising', 'google ads', 'facebook ads', 'linkedin ads', 'instagram marketing',
        'video marketing', 'podcast marketing', 'webinar marketing', 'event marketing', 'trade show',
        'public relations', 'pr tool', 'media monitoring', 'reputation management', 'crisis communication',
        'marketing saas', 'marketing startup', 'marketing agency', 'freelance marketing', 'marketing consultant',
        // Landing Page & Website Builders
        'instapage', 'unbounce', 'mutiny', 'leadpages', 'swipe pages', 'squarespace', 'clickfunnels', 'shogun', 'wix', 'weebly',
        // Email Marketing & Automation
        'hubspot', 'drip', 'omnisend', 'klaviyo', 'salesforce', 'success.ai', 'mailchimp', 'sendlane', 'stripo', 'convertkit',
        'activecampaign', 'constant contact', 'aweber', 'mailerlite', 'moosend', 'campaigner', 'icontact',
        // Documentation & Knowledge Management
        'notion', 'confluence', 'slite', 'helpjuice', 'document360', 'superlist', 'intercom', 'guru', 'freshworks', 'zendesk',
        // Project Management & Productivity
        'asana', 'monday', 'trello', 'wrike', 'clickup', 'smartsheet', 'jira', 'todoist', 'zoho projects', 'airtable',
        // CRM & Sales Tools
        'pipelinepro', 'pipedrive', 'monday crm', 'salesflare', 'folk', 'close', 'insightly', 'capsule',
        'cognism', 'lusha', 'zoominfo', 'kaspr', 'sanebox',
        // AI Marketing & Content Tools
        'vwo', 'copy.ai', 'writesonic', 'frase', 'quillbot', 'deepbrain ai', 'grammarly', 'brainvine', 'anyword',
        'describely', 'owlywriter', 'jasper ai', 'murf ai', 'synthesia', 'sendbird', 'fastbots', 'botpenguin',
        'liveagent', 'elephant.ai', 'semrush', 'scalenut', 'getgenie', 'aiseo', 'trakkr.ai', 'adcreative',
        'pictory', 'descript', 'text.cortex', 'originality', 'ai detector pro', 'surfer', 'smodin',
        // AI Marketing Specific Terms
        'ai marketing', 'marketing ai', 'ai tech', 'ai business', 'ai social media', 'ai advertenties', 'ai wetgeving',
        'artificial intelligence marketing', 'machine learning marketing', 'automated marketing', 'intelligent marketing',
        'ai-powered marketing', 'marketing intelligence', 'predictive marketing', 'ai analytics', 'marketing algorithms'
      ]
    },
    rewriteInstructions: {
      general: 'Rewrite this article in clear English for a technical audience. Preserve all important facts and figures.',
      professional: 'Use a business-oriented, professional tone. Focus on business impact and relevance.',
      engaging: 'Write in an engaging way that captivates readers. Use examples and make it accessible.',
      technical: 'Use technical precision and detailed explanation. Add technical context where relevant.',
      news: 'Write as a professional news article with location/date intro, business-style H2 headers, and source links. Format: "[City], [date] - [lead paragraph]" followed by sections with descriptive headers like "Impact on operations" rather than questions.'
    },
    rssFeeds: []
  })
  
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('cybersecurity')
  const router = useRouter()

  // Get active tab from URL
  const getActiveTab = (): 'categories' | 'keywords' | 'instructions' => {
    if (typeof window === 'undefined') return 'categories'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'keywords' || tab === 'instructions') return tab
    return 'categories'
  }

  const [activeTab, setActiveTab] = useState<'categories' | 'keywords' | 'instructions'>(getActiveTab())

  useEffect(() => {
    loadSettings()

    // Update active tab when URL changes (for browser back/forward)
    const handleUrlChange = () => {
      setActiveTab(getActiveTab())
    }

    window.addEventListener('popstate', handleUrlChange)
    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Settings saved',
          message: 'All changes have been successfully saved',
          duration: 3000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Error saving settings'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not connect to server'
      })
    } finally {
      setSaving(false)
    }
  }

  const addCategory = async () => {
    const newCategory = await showPrompt({
      title: 'New category',
      message: 'Enter the name of the new category:',
      promptPlaceholder: 'Category name...',
      confirmText: 'Add',
      cancelText: 'Cancel'
    })
    
    if (newCategory && !settings.categories.includes(newCategory)) {
      const updatedSettings = {
        ...settings,
        categories: [...settings.categories, newCategory]
      }
      
      setSettings(updatedSettings)
      
      // Auto-save categories
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        })
        
        showNotification({
          type: 'success',
          title: 'Category added & saved',
          message: `"${newCategory}" has been added and saved automatically`,
          duration: 3000
        })
      } catch (error) {
        console.error('Error auto-saving categories:', error)
        showNotification({
          type: 'error', 
          title: 'Save failed',
          message: 'Category added but not saved'
        })
      }
    } else if (newCategory && settings.categories.includes(newCategory)) {
      showNotification({
        type: 'warning',
        title: 'Category exists',
        message: `"${newCategory}" already exists in the list`
      })
    }
  }

  const removeCategory = async (category: string) => {
    const updatedSettings = {
      ...settings,
      categories: settings.categories.filter(c => c !== category)
    }
    
    setSettings(updatedSettings)
    
    // Auto-save categories
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
      console.log('Categories auto-saved')
    } catch (error) {
      console.error('Error auto-saving categories:', error)
    }
  }

  const addKeyword = async (category: string) => {
    const newKeywords = await showPrompt({
      title: 'New keyword(s)',
      message: `Enter keyword(s) for the "${category}" category (separate multiple keywords with commas):`,
      promptPlaceholder: 'keyword1, keyword2, keyword3...',
      confirmText: 'Add',
      cancelText: 'Cancel'
    })

    if (!newKeywords) return

    // Split by comma and trim whitespace
    const keywordsArray = newKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)

    const categoryKeywords = settings.categoryKeywords[category] || []
    const newUniqueKeywords = keywordsArray.filter(k => !categoryKeywords.includes(k))
    const duplicates = keywordsArray.filter(k => categoryKeywords.includes(k))

    if (newUniqueKeywords.length > 0) {
      setSettings(prev => ({
        ...prev,
        categoryKeywords: {
          ...prev.categoryKeywords,
          [category]: [...categoryKeywords, ...newUniqueKeywords]
        }
      }))

      showNotification({
        type: 'success',
        title: `${newUniqueKeywords.length} keyword${newUniqueKeywords.length > 1 ? 's' : ''} added`,
        message: `Added: ${newUniqueKeywords.join(', ')}${duplicates.length > 0 ? ` (${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} skipped)` : ''}`,
        duration: 4000
      })
    } else if (duplicates.length > 0) {
      showNotification({
        type: 'warning',
        title: 'All keywords exist',
        message: `All entered keywords already exist in this category`
      })
    }
  }

  const removeKeyword = (category: string, keyword: string) => {
    setSettings(prev => ({
      ...prev,
      categoryKeywords: {
        ...prev.categoryKeywords,
        [category]: (prev.categoryKeywords[category] || []).filter(k => k !== keyword)
      }
    }))
  }

  const updateInstruction = async (type: keyof typeof settings.rewriteInstructions, value: string) => {
    const updatedSettings = {
      ...settings,
      rewriteInstructions: {
        ...settings.rewriteInstructions,
        [type]: value
      }
    }
    
    setSettings(updatedSettings)
    
    // Auto-save AI instructions
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
      console.log('AI instructions auto-saved')
    } catch (error) {
      console.error('Error auto-saving AI instructions:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Logo size="lg" className="mr-4" clickable={true} href="/dashboard" />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to dashboard
              </button>
              <div className="text-sm text-gray-600 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Auto-save enabled
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'categories', label: 'Categories', href: '/dashboard/settings' },
              { id: 'keywords', label: 'Keywords', href: '/dashboard/settings?tab=keywords' },
              { id: 'instructions', label: 'AI Instructions', href: '/dashboard/settings?tab=instructions' }
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </a>
            ))}
            <a
              href="/dashboard/feeds"
              className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm flex items-center cursor-pointer"
            >
              RSS Feeds
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>
        </div>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Article Categories</h2>
              <button
                  onClick={addCategory}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  + Add Category
                </button>
            </div>
            
            <div className="space-y-3">
              {settings.categories.map((category) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{category}</span>
                  <button
                    onClick={() => removeCategory(category)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Category Keywords</h2>
              <p className="text-sm text-gray-600 mt-1">Manage keywords for each category to filter relevant articles</p>
            </div>
            
            {/* Category Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {settings.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Keywords for Selected Category */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Keywords for "{selectedCategory}"</h3>
                <button
                  onClick={() => addKeyword(selectedCategory)}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  + Add Keyword
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(settings.categoryKeywords[selectedCategory] || []).map((keyword) => (
                  <div key={keyword} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                    <span className="font-medium text-sm">{keyword}</span>
                    <button
                      onClick={() => removeKeyword(selectedCategory, keyword)}
                      className="text-red-600 hover:text-red-700 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {(!settings.categoryKeywords[selectedCategory] || settings.categoryKeywords[selectedCategory].length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No keywords for this category yet. Add some to start filtering articles.
                </div>
              )}
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">ℹ️ How category-based filtering works</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Each category has its own set of keywords for precise filtering</p>
                <p>• Articles are matched to categories based on their keywords</p>
                <p>• Case-insensitive matching in title and description</p>
                <p>• Articles must contain at least one keyword from the category to be assigned</p>
                <p>• Support both English and Dutch keywords for multilingual sources</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Instructions Tab */}
        {activeTab === 'instructions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">AI Rewrite Instructions</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Instructions
                </label>
                <textarea
                  value={settings.rewriteInstructions.general}
                  onChange={(e) => updateInstruction('general', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Style
                </label>
                <textarea
                  value={settings.rewriteInstructions.professional}
                  onChange={(e) => updateInstruction('professional', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engaging Style
                </label>
                <textarea
                  value={settings.rewriteInstructions.engaging}
                  onChange={(e) => updateInstruction('engaging', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Style
                </label>
                <textarea
                  value={settings.rewriteInstructions.technical}
                  onChange={(e) => updateInstruction('technical', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  News Style
                </label>
                <textarea
                  value={settings.rewriteInstructions.news}
                  onChange={(e) => updateInstruction('news', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}