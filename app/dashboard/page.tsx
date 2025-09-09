'use client'

import { useState, useEffect } from 'react'
import { NewsArticle } from '../../lib/airtable'
import Logo from '../../components/Logo'
import { useNotifications } from '../../components/NotificationSystem'

export default function DashboardPage() {
  const { showNotification } = useNotifications()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cybersecurity-nl', 'cybersecurity-international', 'other'])
  const [selectedStatus, setSelectedStatus] = useState<string>('pending')

  useEffect(() => {
    fetchArticles()
  }, [selectedCategories, selectedStatus])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      // Add each selected category as a separate parameter
      selectedCategories.forEach(category => {
        params.append('category', category)
      })
      
      const response = await fetch(`/api/articles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(data)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
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

  const fetchNewArticles = async () => {
    setFetching(true)
    try {
      const response = await fetch('/api/articles/fetch', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        showNotification({
          type: 'success',
          title: 'New articles fetched',
          message: `${result.newArticles} new articles added`,
          duration: 4000
        })
        fetchArticles() // Refresh the list
      } else {
        showNotification({
          type: 'error',
          title: 'Fetch failed',
          message: 'Could not fetch new articles'
        })
      }
    } catch (error) {
      console.error('Error fetching new articles:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Error fetching new articles'
      })
    } finally {
      setFetching(false)
    }
  }

  const selectArticle = async (articleId: string) => {
    try {
      console.log('Selecting article:', articleId)
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'selected' })
      })
      
      console.log('Select response:', response.status)
      
      if (response.ok) {
        console.log('Article selected successfully')
        fetchArticles() // Refresh the list
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
                onClick={fetchNewArticles}
                disabled={fetching}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {fetching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Fetch New Articles
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
                { value: 'pending', label: 'Pending', icon: '⏳', count: articles.filter(a => a.status === 'pending').length },
                { value: 'selected', label: 'Selected', icon: '✓', count: articles.filter(a => a.status === 'selected').length },
                { value: 'rewritten', label: 'Rewritten', icon: '✨', count: articles.filter(a => a.status === 'rewritten').length },
                { value: 'published', label: 'Published', icon: '📢', count: articles.filter(a => a.status === 'published').length }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedStatus === status.value
                      ? 'bg-gray-900 text-white shadow-md'
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
              {['cybersecurity-nl', 'cybersecurity-international', 'tech-nl', 'tech-international', 'other'].map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    selectedCategories.includes(category)
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    selectedCategories.includes(category) ? 'bg-white' : 'bg-gray-400'
                  }`} />
                  <span>
                    {category === 'cybersecurity-nl' && 'Cybersecurity NL'}
                    {category === 'cybersecurity-international' && 'Cybersecurity International'}
                    {category === 'tech-nl' && 'Tech NL'}
                    {category === 'tech-international' && 'Tech International'}
                    {category === 'other' && 'Other'}
                  </span>
                </button>
              ))}
            </div>
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
            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Modern image placeholder */}
                <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                  <div className="text-gray-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                </div>
                
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
                  
                  <p className="text-gray-600 text-sm mb-5 line-clamp-3 leading-relaxed">
                    {article.description}
                  </p>
                  
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
                        Bekijk
                      </a>
                      
                      {article.status === 'pending' && (
                        <button
                          onClick={() => selectArticle(article.id!)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Select
                        </button>
                      )}
                      
                      {article.status === 'selected' && (
                        <a
                          href={`/dashboard/rewrite/${article.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rewrite
                        </a>
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
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600 mb-6">Try adjusting the filters or fetch new articles.</p>
          </div>
        )}
      </div>
    </div>
  )
}