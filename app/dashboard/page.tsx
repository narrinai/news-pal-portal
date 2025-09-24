'use client'

import { useState, useEffect } from 'react'
import { NewsArticle } from '../../lib/airtable'
import { LiveArticle } from '../../lib/article-manager'
import Logo from '../../components/Logo'
import { useNotifications } from '../../components/NotificationSystem'

export default function DashboardPage() {
  const { showNotification } = useNotifications()
  const [liveData, setLiveData] = useState<{
    pending: LiveArticle[]
    selected: NewsArticle[]
    rewritten: NewsArticle[]
    published: NewsArticle[]
  }>({ pending: [], selected: [], rewritten: [], published: [] })
  
  const [loading, setLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [keywordFiltering, setKeywordFiltering] = useState<boolean>(true)
  const [cacheStatus, setCacheStatus] = useState<any>(null)

  // Get all articles for display
  const allArticles = [
    ...liveData.pending.map(a => ({ ...a, status: 'pending' as const, id: a.url })),
    ...liveData.selected,
    ...liveData.rewritten, 
    ...liveData.published
  ]

  // Log filtering state for debugging
  console.log('Filtering state:', {
    totalArticles: allArticles.length,
    selectedCategories,
    selectedStatus,
    sampleArticleCategories: allArticles.slice(0, 3).map(a => a.category)
  })

  // Filter articles based on selected criteria
  const filteredArticles = allArticles.filter(article => {
    // Status filter
    if (selectedStatus !== 'all' && article.status !== selectedStatus) {
      return false
    }
    
    // Category filter  
    if (!selectedCategories.includes(article.category)) {
      return false
    }
    
    // Language filter - now based on source language instead of category
    if (languageFilter !== 'all') {
      // Determine language based on source
      const dutchSources = [
        // Cybersecurity Dutch sources
        'Tweakers', 'Security.NL', 'SecurityNL', 'security.nl', 'NOS Tech', 'NU.nl Tech', 'Techzine', 'Computable',
        'RSS App Cybersecurity Feed',
        // Marketing Dutch sources (exact feed names)
        'Marketing Tribune Nederland', 'Frank Watching', 'Marketing Facts', 'Emerce', 'Marketing Online',
        'B2B Marketing Nederland', 'Agentschap Nederland'
      ]
      const isDutch = dutchSources.some(source => article.source?.includes(source))
      const isInternational = !isDutch
      
      // Debug language filtering
      if (allArticles.indexOf(article) < 3) {
        console.log('Language filter debug:', {
          title: article.title?.substring(0, 30),
          source: article.source,
          isDutch,
          isInternational,
          languageFilter,
          willPass: languageFilter === 'all' || (languageFilter === 'nl' && isDutch) || (languageFilter === 'international' && isInternational)
        })
      }
      
      if (languageFilter === 'nl' && !isDutch) {
        return false
      }
      if (languageFilter === 'international' && !isInternational) {
        return false
      }
    }
    
    return true
  })
  
  console.log('After filtering:', {
    filteredCount: filteredArticles.length,
    selectedCategories,
    selectedCategoriesValues: selectedCategories
  })

  useEffect(() => {
    // Only fetch articles after first manual refresh
    if (hasLoadedOnce) {
      fetchArticles()
    }
  }, [selectedCategories, selectedStatus, keywordFiltering, languageFilter, hasLoadedOnce])

  const fetchArticles = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (forceRefresh) params.append('refresh', 'true')
      if (!keywordFiltering) params.append('nofilter', 'true')
      // Add timestamp for cache busting
      params.append('t', Date.now().toString())

      console.log('Fetching live articles...', { forceRefresh, keywordFiltering })
      const response = await fetch(`/api/articles/live?${params}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      console.log('Live API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Live articles response:', data)
        setLiveData(data.articles)
        setCacheStatus(data.cache)
        console.log('Live articles loaded:', data.totalCounts)
        console.log('Sample article categories:', data.articles.pending.slice(0, 5).map(a => ({ title: a.title?.substring(0, 30), category: a.category })))
        console.log('All unique categories in articles:', Array.from(new Set(data.articles.pending.map(a => a.category))))
        console.log('Article sources sample:', data.articles.pending.slice(0, 10).map(a => ({ source: a.source, category: a.category })))
      } else {
        const errorText = await response.text()
        console.error('Live API error:', response.status, errorText)
        showNotification({
          type: 'error',
          title: 'Loading failed',
          message: `API error: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      showNotification({
        type: 'error',
        title: 'Loading failed',
        message: 'Could not load articles'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  const refreshArticles = async () => {
    setRefreshing(true)
    setHasLoadedOnce(true) // Mark as loaded for future filter changes
    try {
      // Clear RSS cache first
      console.log('Clearing RSS cache before refresh...')
      await fetch('/api/cache/clear', {
        method: 'POST',
        cache: 'no-cache'
      })

      await fetchArticles(true) // Force refresh RSS cache
      console.log('Articles refreshed successfully')
      // Removed success notification - silent refresh
    } catch (error) {
      console.error('Error refreshing articles:', error)
      showNotification({
        type: 'error',
        title: 'Refresh failed',
        message: 'Could not refresh articles'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const selectArticle = async (articleUrl: string) => {
    try {
      console.log('Selecting article:', articleUrl)
      
      // Find the article in pending list
      const article = liveData.pending.find(a => a.url === articleUrl)
      if (!article) {
        showNotification({
          type: 'error',
          title: 'Article not found',
          message: 'Could not find article in RSS data'
        })
        return
      }

      const response = await fetch('/api/articles/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article })
      })
      
      console.log('Select response:', response.status)
      
      if (response.ok) {
        console.log('Article selected and saved to Airtable')
        fetchArticles() // Refresh to show updated state
        // Removed notification - silent selection
      } else {
        const errorText = await response.text()
        console.error('Failed to select article:', response.status, errorText)
        showNotification({
          type: 'error',
          title: 'Selection failed',
          message: `Server error: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Error selecting article:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Error selecting article'
      })
    }
  }

  const deselectArticle = async (articleId: string) => {
    try {
      console.log('Deselecting article:', articleId)
      
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('Deselect response:', response.status)
      
      if (response.ok) {
        console.log('Article deselected and removed from Airtable')
        fetchArticles() // Refresh to show updated state
      } else {
        const errorText = await response.text()
        console.error('Failed to deselect article:', response.status, errorText)
        showNotification({
          type: 'error',
          title: 'Deselect failed',
          message: `Server error: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Error deselecting article:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Error deselecting article'
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
            <div className="flex space-x-3">
              <a
                href="/dashboard/settings"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </a>
              <button
                onClick={refreshArticles}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh with New Categorization
                    {cacheStatus && cacheStatus.isStale && (
                      <span className="ml-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          {/* Status Filter */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Status Filter</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'all', label: 'All statuses', icon: '📋' },
                { value: 'pending', label: 'Pending', icon: '⏳', count: filteredArticles.filter(a => a.status === 'pending').length },
                { value: 'selected', label: 'Selected', icon: '✓', count: filteredArticles.filter(a => a.status === 'selected').length },
                { value: 'rewritten', label: 'Rewritten', icon: '✨', count: filteredArticles.filter(a => a.status === 'rewritten').length },
                { value: 'published', label: 'Published', icon: '📢', count: filteredArticles.filter(a => a.status === 'published').length }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedStatus === status.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                >
                  <span className="mr-2">{status.icon}</span>
                  <span>{status.label}</span>
                  {status.count !== undefined && status.count > 0 && (
                    <span className={`ml-2 rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-bold px-1 ${
                      selectedStatus === status.value 
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-900 text-white'
                    }`}>
                      {status.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Categories</label>
            <div className="flex flex-wrap gap-3">
              {['cybersecurity', 'bouwcertificaten', 'ai-companion', 'ai-learning', 'marketingtoolz'].map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    selectedCategories.includes(category)
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    selectedCategories.includes(category) ? 'bg-white' : 'bg-gray-400'
                  }`} />
                  <span>
                    {category === 'cybersecurity' && '🔒 Cybersecurity'}
                    {category === 'bouwcertificaten' && '🏗️ Bouwcertificaten'}
                    {category === 'ai-companion' && '🤖 AI Companion'}
                    {category === 'ai-learning' && '🎓 AI Learning'}
                    {category === 'marketingtoolz' && '📈 Marketingtoolz'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Language Filter */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Language Filter</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: '🌍 All Languages', count: filteredArticles.length },
                { value: 'nl', label: '🇳🇱 Nederlands', count: allArticles.filter(a => a.category.includes('-nl')).length },
                { value: 'international', label: '🌐 International', count: allArticles.filter(a => a.category.includes('-international')).length }
              ].map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguageFilter(lang.value)}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    languageFilter === lang.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span>{lang.label}</span>
                  {lang.count > 0 && (
                    <span className={`ml-2 rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-bold px-1 ${
                      languageFilter === lang.value 
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-900 text-white'
                    }`}>
                      {lang.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Keyword Filtering Toggle */}
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div>
              <label className="text-sm font-medium text-gray-900">Keyword Filtering</label>
              <p className="text-xs text-gray-600 mt-1">
                {keywordFiltering ? 'Showing only articles matching your keywords' : 'Showing all articles from RSS feeds'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={keywordFiltering}
                onChange={(e) => {
                  setKeywordFiltering(e.target.checked)
                  // Auto-refresh articles when toggle changes
                  if (hasLoadedOnce) {
                    setTimeout(() => fetchArticles(true), 100)
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {keywordFiltering ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading articles...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => {
              // Debug logging
              console.log('Article data:', {
                title: article.title?.substring(0, 30),
                category: article.category,
                matchedKeywords: (article as any).matchedKeywords,
                hasMatchedKeywords: !!(article as any).matchedKeywords
              })
              
              return (
              <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      article.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      article.status === 'selected' ? 'bg-blue-100 text-blue-800' :
                      article.status === 'rewritten' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        article.status === 'pending' ? 'bg-amber-400' :
                        article.status === 'selected' ? 'bg-blue-400' :
                        article.status === 'rewritten' ? 'bg-emerald-400' :
                        'bg-gray-400'
                      }`}></span>
                      {article.status}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{article.source}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3 leading-relaxed">
                    {article.description}
                  </p>
                  
                  {/* Matched Keywords Tags */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 mt-2">
                      {/* Debug: Always show some test keywords to verify UI works */}
                      {(article as any).matchedKeywords && (article as any).matchedKeywords.length > 0 ? (
                        <>
                          {(article as any).matchedKeywords.slice(0, 3).map((keyword: string) => (
                            <span 
                              key={keyword}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              🔍 {keyword}
                            </span>
                          ))}
                          {(article as any).matchedKeywords.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              +{(article as any).matchedKeywords.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        /* Fallback debug tags */
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            🐛 No keywords data
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Category: {article.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                      {new Date(article.publishedAt).toLocaleDateString('nl-NL')}
                    </span>
                    
                    <div className="flex space-x-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View
                      </a>
                      
                      {article.status === 'pending' && (
                        <button
                          onClick={() => selectArticle(article.url || article.id!)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Select & Save
                        </button>
                      )}
                      
                      {article.status === 'selected' && (
                        <div className="flex space-x-1">
                          <a
                            href={`/dashboard/rewrite/${article.id}`}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rewrite
                          </a>
                          <button
                            onClick={() => deselectArticle(article.id!)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Deselect
                          </button>
                        </div>
                      )}
                      
                      {article.status === 'rewritten' && (
                        <a
                          href={`/dashboard/rewrite/${article.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {!loading && !hasLoadedOnce && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to News Pal Portal</h3>
            <p className="text-gray-600 mb-6">Select categories above and click "Refresh Articles" to load the latest news.</p>
            <button
              onClick={refreshArticles}
              disabled={refreshing || selectedCategories.length === 0}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {selectedCategories.length === 0 ? 'Select categories first' : 'Get Started - Load Articles'}
            </button>
          </div>
        )}

        {!loading && hasLoadedOnce && selectedCategories.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories selected</h3>
            <p className="text-gray-600 mb-6">Please select one or more categories above to view articles.</p>
          </div>
        )}

        {!loading && hasLoadedOnce && selectedCategories.length > 0 && filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600 mb-6">Try adjusting filters, refreshing articles, or adding RSS feeds in Settings.</p>
          </div>
        )}
      </div>
    </div>
  )
}