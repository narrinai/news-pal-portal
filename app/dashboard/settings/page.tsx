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
    }
  })
  
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('cybersecurity')
  const [feeds, setFeeds] = useState<any[]>([])
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [feedsLoaded, setFeedsLoaded] = useState(false)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({
    url: '',
    name: '',
    category: 'cybersecurity',
    maxArticles: 25
  })
  const router = useRouter()

  // Get active tab from URL
  const getActiveTab = (): 'categories' | 'keywords' | 'instructions' | 'feeds' => {
    if (typeof window === 'undefined') return 'categories'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'keywords' || tab === 'instructions' || tab === 'feeds') return tab
    return 'categories'
  }

  const [activeTab, setActiveTab] = useState<'categories' | 'keywords' | 'instructions' | 'feeds'>(getActiveTab())

  useEffect(() => {
    loadSettings()

    // Load feeds in background after initial render
    setTimeout(() => {
      loadFeeds()
    }, 500) // Small delay to not block initial page load

    // Update active tab when URL changes (for browser back/forward)
    const handleUrlChange = () => {
      setActiveTab(getActiveTab())
    }

    window.addEventListener('popstate', handleUrlChange)
    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [])

  const loadFeeds = async () => {
    if (feedsLoaded) return // Don't reload if already loaded

    setFeedsLoading(true)
    try {
      const response = await fetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data)
        setFeedsLoaded(true)
        console.log('✅ Feeds loaded in background:', data.length)
      }
    } catch (error) {
      console.error('Error loading feeds:', error)
    } finally {
      setFeedsLoading(false)
    }
  }

  const toggleFeed = async (feedId: string) => {
    const updatedFeeds = feeds.map(feed =>
      feed.id === feedId ? { ...feed, enabled: !feed.enabled } : feed
    )
    setFeeds(updatedFeeds)

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        const toggledFeed = updatedFeeds.find(f => f.id === feedId)
        showNotification({
          type: 'success',
          title: toggledFeed?.enabled ? 'Feed enabled' : 'Feed disabled',
          message: `${toggledFeed?.name} is now ${toggledFeed?.enabled ? 'enabled' : 'disabled'}`,
          duration: 3000
        })
      } else {
        // Revert on error
        setFeeds(feeds)
        showNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Could not save feed status'
        })
      }
    } catch (error) {
      console.error('Error toggling feed:', error)
      setFeeds(feeds)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not connect to server'
      })
    }
  }

  const addFeed = async () => {
    if (!newFeed.url || !newFeed.name) {
      showNotification({
        type: 'warning',
        title: 'Fields required',
        message: 'URL and name are required to add an RSS feed'
      })
      return
    }

    try {
      const response = await fetch('/api/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFeed,
          enabled: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Add new feed to top of the list immediately
        setFeeds(prev => [result.feed, ...prev])
        setNewFeed({ url: '', name: '', category: 'cybersecurity', maxArticles: 25 })
        setShowAddFeed(false)
        showNotification({
          type: 'success',
          title: 'RSS feed added',
          message: `${newFeed.name} has been successfully added`,
          duration: 4000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Add failed',
          message: 'Could not add RSS feed'
        })
      }
    } catch (error) {
      console.error('Error adding feed:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not add RSS feed'
      })
    }
  }

  const removeFeed = async (feedId: string) => {
    const feedToRemove = feeds.find(f => f.id === feedId)
    const confirmed = await showConfirm({
      title: 'Remove RSS feed',
      message: `Are you sure you want to remove "${feedToRemove?.name}"? This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    const updatedFeeds = feeds.filter(feed => feed.id !== feedId)

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        setFeeds(updatedFeeds)
        showNotification({
          type: 'success',
          title: 'Feed removed',
          message: `${feedToRemove?.name} has been successfully removed`,
          duration: 4000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Remove failed',
          message: 'Could not remove RSS feed'
        })
      }
    } catch (error) {
      console.error('Error removing feed:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not connect to server'
      })
    }
  }

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
              { id: 'instructions', label: 'AI Instructions', href: '/dashboard/settings?tab=instructions' },
              { id: 'feeds', label: 'RSS Feeds', href: '/dashboard/settings?tab=feeds' }
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab(tab.id as 'categories' | 'keywords' | 'instructions' | 'feeds')
                  window.history.pushState({}, '', tab.href)
                  // Load feeds when switching to feeds tab
                  if (tab.id === 'feeds' && !feedsLoaded) {
                    loadFeeds()
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </a>
            ))}
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

        {/* RSS Feeds Tab */}
        {activeTab === 'feeds' && (
          <>
            {/* Add Feed Form */}
            {showAddFeed && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Add New RSS Feed</h3>
                    <p className="text-sm text-gray-600 mt-1">We'll automatically detect and use the RSS feed</p>
                  </div>
                  <button
                    onClick={() => setShowAddFeed(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feed Name
                    </label>
                    <input
                      type="text"
                      value={newFeed.name}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="e.g. TechCrunch Security"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feed URL
                    </label>
                    <input
                      type="url"
                      value={newFeed.url}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="https://example.com/feed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newFeed.category}
                        onChange={(e) => setNewFeed(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {settings.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Articles
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={newFeed.maxArticles}
                        onChange={(e) => setNewFeed(prev => ({ ...prev, maxArticles: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddFeed(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addFeed}
                      className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-md transition-colors duration-200"
                    >
                      Add Feed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feeds List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">RSS Feed Sources</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {feedsLoading ? 'Loading feeds...' : `${feeds.length} feeds configured • ${feeds.filter(f => f.enabled).length} active`}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddFeed(true)}
                  className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  + Add RSS Feed
                </button>
              </div>

              {feedsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-600">Loading feeds...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feeds.map((feed) => (
                    <div key={feed.id} className="border rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium text-gray-900">{feed.name}</div>
                            <div className="text-sm text-gray-500">{feed.url}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {feed.category} • Max {feed.maxArticles || 25} articles
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => toggleFeed(feed.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            feed.enabled
                              ? 'bg-green-500 focus:ring-green-500'
                              : 'bg-gray-300 focus:ring-gray-400'
                          }`}
                          role="switch"
                          aria-checked={feed.enabled}
                          aria-label={`Toggle ${feed.name}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              feed.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => removeFeed(feed.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          aria-label={`Delete ${feed.name}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {feeds.length === 0 && !feedsLoading && (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                      <p className="mt-4 text-lg font-medium">No RSS feeds configured</p>
                      <p className="mt-2 text-sm">Add your first feed to start collecting articles</p>
                      <button
                        onClick={() => setShowAddFeed(true)}
                        className="mt-4 bg-gray-900 text-white hover:bg-gray-800 px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        + Add Your First Feed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">🔍 How RSS feed management works:</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div><strong>1. Centralized in Airtable:</strong> All feed configurations are stored in Airtable</div>
                <div><strong>2. Instant Sync:</strong> Changes here sync immediately to Airtable</div>
                <div><strong>3. Manual Control:</strong> Edit maxArticles and other settings directly in Airtable</div>
                <div><strong>4. Active Feeds Only:</strong> Only enabled feeds are processed during article collection</div>
                <div><strong>5. No Code Deployments:</strong> Add or remove feeds without touching code</div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 rounded-md">
                <div className="font-medium text-blue-900 mb-1">💡 Pro Tip:</div>
                <div className="text-sm text-blue-700">
                  You can edit feed names, URLs, categories, and maxArticles directly in Airtable. Changes are reflected immediately!
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}