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
    categories: ['cybersecurity-nl', 'cybersecurity-international', 'bouwcertificaten-nl', 'ai-companion-international', 'ai-learning-international', 'other'],
    categoryKeywords: {
      'cybersecurity-nl': ['beveiliging', 'cyberbeveiliging', 'datalek', 'privacy', 'hack', 'malware'],
      'cybersecurity-international': ['security', 'cybersecurity', 'hack', 'breach', 'malware', 'ransomware', 'phishing', 'vulnerability', 'exploit'],
      'bouwcertificaten-nl': ['bouwcertificaat', 'bouw certificaat', 'woningcertificaat', 'energielabel', 'bouwvergunning', 'woningbouw', 'certificering', 'bouwtoezicht'],
      'ai-companion-international': ['AI companion', 'AI assistant', 'virtual assistant', 'chatbot', 'conversational AI', 'AI girlfriend', 'AI boyfriend', 'character AI'],
      'ai-learning-international': ['AI learning', 'machine learning', 'deep learning', 'AI education', 'AI training', 'AI tutorial', 'AI course', 'neural networks'],
      'other': ['news', 'nieuws', 'update', 'announcement']
    },
    rewriteInstructions: {
      general: 'Rewrite this article in clear English for a technical audience. Preserve all important facts and figures.',
      professional: 'Use a business-oriented, professional tone. Focus on business impact and relevance.',
      engaging: 'Write in an engaging way that captivates readers. Use examples and make it accessible.',
      technical: 'Use technical precision and detailed explanation. Add technical context where relevant.'
    },
    rssFeeds: []
  })
  
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({
    url: '',
    name: '',
    category: 'cybersecurity-international',
    maxArticles: 10
  })
  
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'keywords' | 'instructions' | 'feeds'>('categories')
  const [selectedCategory, setSelectedCategory] = useState('cybersecurity-nl')
  const router = useRouter()

  useEffect(() => {
    loadSettings()
    loadFeeds()
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

  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/feeds')
      if (response.ok) {
        const feeds = await response.json()
        console.log('Loaded feeds:', feeds.length)
        setSettings(prev => ({ ...prev, rssFeeds: feeds }))
      } else {
        console.error('Failed to load feeds:', response.status)
      }
    } catch (error) {
      console.error('Error loading feeds:', error)
    }
  }

  const addWorkingDutchFeeds = async () => {
    try {
      const response = await fetch('/api/feeds/add-working-nl', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        showNotification({
          type: 'success',
          title: 'Dutch feeds added',
          message: `${result.feedsAdded} Nederlandse feeds toegevoegd`,
          duration: 4000
        })
        await loadFeeds() // Refresh the list
      }
    } catch (error) {
      console.error('Error adding Dutch feeds:', error)
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Could not add Dutch feeds'
      })
    }
  }

  const addInternationalCyberFeeds = async () => {
    try {
      const response = await fetch('/api/feeds/add-international-cybersecurity', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        showNotification({
          type: 'success',
          title: 'International cybersecurity feeds added',
          message: `${result.feedsAdded} international feeds added successfully`,
          duration: 4000
        })
        await loadFeeds() // Refresh the list
      } else {
        const error = await response.json()
        showNotification({
          type: 'warning',
          title: 'Feeds already exist',
          message: error.message || 'Some feeds may already be configured'
        })
      }
    } catch (error) {
      console.error('Error adding international cybersecurity feeds:', error)
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Could not add international cybersecurity feeds'
      })
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
    const newKeyword = await showPrompt({
      title: 'New keyword',
      message: `Enter a new keyword for the "${category}" category:`,
      promptPlaceholder: 'Keyword...',
      confirmText: 'Add',
      cancelText: 'Cancel'
    })
    
    const categoryKeywords = settings.categoryKeywords[category] || []
    if (newKeyword && !categoryKeywords.includes(newKeyword.toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        categoryKeywords: {
          ...prev.categoryKeywords,
          [category]: [...categoryKeywords, newKeyword.toLowerCase()]
        }
      }))
      showNotification({
        type: 'success',
        title: 'Keyword added',
        message: `"${newKeyword}" has been added to ${category}`,
        duration: 3000
      })
    } else if (newKeyword && categoryKeywords.includes(newKeyword.toLowerCase())) {
      showNotification({
        type: 'warning',
        title: 'Keyword exists',
        message: `"${newKeyword}" already exists in this category`
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

  const addFeed = async () => {
    console.log('Adding new feed:', newFeed)
    
    if (!newFeed.url || !newFeed.name) {
      showNotification({
        type: 'warning',
        title: 'Fields required',
        message: 'URL and name are required to add an RSS feed'
      })
      return
    }

    try {
      console.log('Sending PUT request to /api/feeds')
      const response = await fetch('/api/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFeed,
          enabled: true
        })
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Feed added successfully:', result)
        
        // Add new feed to top of the list immediately
        setSettings(prev => ({
          ...prev,
          rssFeeds: [result.feed, ...prev.rssFeeds]
        }))
        
        setNewFeed({ url: '', name: '', category: 'cybersecurity-international', maxArticles: 10 })
        setShowAddFeed(false)
        showNotification({
          type: 'success',
          title: 'RSS feed added',
          message: `${newFeed.name} has been successfully added`,
          duration: 4000
        })
      } else {
        const errorText = await response.text()
        console.error('API error response:', response.status, errorText)
        showNotification({
          type: 'error',
          title: 'Add failed',
          message: `Server error: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Error adding feed:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not add RSS feed due to network problems'
      })
    }
  }

  const toggleFeed = async (feedId: string) => {
    const updatedFeeds = settings.rssFeeds.map(feed => 
      feed.id === feedId ? { ...feed, enabled: !feed.enabled } : feed
    )

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, rssFeeds: updatedFeeds }))
        const toggledFeed = updatedFeeds.find(f => f.id === feedId)
        showNotification({
          type: 'success',
          title: toggledFeed?.enabled ? 'Website source enabled' : 'Website source disabled',
          message: `${toggledFeed?.name} is now ${toggledFeed?.enabled ? 'enabled' : 'disabled'}`,
          duration: 3000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Could not save source status'
        })
      }
    } catch (error) {
      console.error('Error toggling feed:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not connect to server'
      })
    }
  }

  const removeFeed = async (feedId: string) => {
    const feedToRemove = settings.rssFeeds.find(f => f.id === feedId)
    const confirmed = await showConfirm({
      title: 'Remove website source',
      message: `Are you sure you want to remove "${feedToRemove?.name}"? This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })
    
    if (!confirmed) return

    const updatedFeeds = settings.rssFeeds.filter(feed => feed.id !== feedId)
    
    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, rssFeeds: updatedFeeds }))
        showNotification({
          type: 'success',
          title: 'Website source removed',
          message: `${feedToRemove?.name} has been successfully removed`,
          duration: 4000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Remove failed',
          message: 'Could not remove website source'
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
              { id: 'categories', label: 'Categories' },
              { id: 'keywords', label: 'Keywords' },
              { id: 'instructions', label: 'AI Instructions' },
              { id: 'feeds', label: 'RSS Feeds' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
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
            </div>
          </div>
        )}

        {/* RSS Feeds Tab */}
        {activeTab === 'feeds' && (
          <div className="space-y-6">
            {/* Add Website Form */}
            {showAddFeed && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Add New Website Source</h3>
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
                      Website Name
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
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={newFeed.url}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="https://example.com (we'll find the RSS feed)"
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
                        max="50"
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
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      Add Website
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Feeds */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">RSS Feed Sources</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage your RSS feed sources for article collection</p>
                </div>
                <button
                  onClick={() => {
                    console.log('Add Website button clicked')
                    setShowAddFeed(true)
                  }}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  + Add RSS Feed
                </button>
              </div>

              <div className="space-y-4">
                {settings.rssFeeds.map((feed) => (
                  <div key={feed.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${feed.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <div className="font-medium text-gray-900">{feed.name}</div>
                          <div className="text-sm text-gray-500">{feed.url}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {feed.category} • Max {feed.maxArticles || 10} articles
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleFeed(feed.id)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          feed.enabled 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {feed.enabled ? 'Active' : 'Inactive'}
                      </button>
                      
                      <button
                        onClick={() => removeFeed(feed.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-2"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {settings.rssFeeds.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No website sources configured. Add one to get started!
                  </div>
                )}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">🔍 How the article discovery works:</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div><strong>1. Website Sources:</strong> Only active sources are processed</div>
                <div><strong>2. RSS Detection:</strong> We automatically find RSS feeds from website URLs</div>
                <div><strong>3. Keyword Filtering:</strong> Articles are filtered using your custom keywords</div>
                <div><strong>4. Duplicate Prevention:</strong> URL-based filtering to avoid duplicates</div>
                <div><strong>5. Manual Review:</strong> Articles start as "pending" for your selection</div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-md">
                <div className="font-medium text-blue-900 mb-1">💡 Tip:</div>
                <div className="text-sm text-blue-700">
                  Add website homepages (like https://techcrunch.com) - we'll automatically find their RSS feeds!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}