'use client'

import { useState, useEffect } from 'react'
import { NewsArticle } from '../../../lib/airtable'
import { LiveArticle } from '../../../lib/article-manager'
import { useNotifications } from '../../../components/NotificationSystem'
import {
  RefreshCw, Plus, ExternalLink, Check, Trash2,
  FileText, Filter, X, PenLine
} from 'lucide-react'

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
  const [showAddArticleModal, setShowAddArticleModal] = useState(false)
  const [newArticleUrl, setNewArticleUrl] = useState('')
  const [newArticleCategory, setNewArticleCategory] = useState('ai-companion')
  const [isAddingArticle, setIsAddingArticle] = useState(false)

  const allArticles = [
    ...liveData.pending.map(a => ({ ...a, status: 'pending' as const, id: a.url })),
    ...liveData.selected,
    ...liveData.rewritten,
    ...liveData.published
  ]

  const filteredArticles = allArticles.filter(article => {
    if (selectedStatus !== 'all' && article.status !== selectedStatus) return false
    if (!selectedCategories.includes(article.category)) return false
    if (languageFilter !== 'all') {
      const dutchSources = [
        'Tweakers', 'Security.NL', 'SecurityNL', 'security.nl', 'NOS Tech', 'NU.nl Tech', 'Techzine', 'Computable',
        'RSS App Cybersecurity Feed',
        'Marketing Tribune Nederland', 'Frank Watching', 'Marketing Facts', 'Emerce', 'Marketing Online',
        'B2B Marketing Nederland', 'Agentschap Nederland'
      ]
      const isDutch = dutchSources.some(source => article.source?.includes(source))
      if (languageFilter === 'nl' && !isDutch) return false
      if (languageFilter === 'international' && isDutch) return false
    }
    return true
  })

  useEffect(() => {
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
      params.append('t', Date.now().toString())

      const response = await fetch(`/api/articles/live?${params}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (response.ok) {
        const data = await response.json()
        setLiveData(data.articles)
        setCacheStatus(data.cache)
      } else {
        showNotification({ type: 'error', title: 'Loading failed', message: `API error: ${response.status}` })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Loading failed', message: 'Could not load articles' })
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  const refreshArticles = async () => {
    setRefreshing(true)
    setHasLoadedOnce(true)
    try {
      await fetch('/api/cache/clear', { method: 'POST', cache: 'no-cache' })
      await fetchArticles(true)
    } catch (error) {
      showNotification({ type: 'error', title: 'Refresh failed', message: 'Could not refresh articles' })
    } finally {
      setRefreshing(false)
    }
  }

  const selectArticle = async (articleUrl: string) => {
    try {
      const article = liveData.pending.find(a => a.url === articleUrl)
      if (!article) {
        showNotification({ type: 'error', title: 'Article not found', message: 'Could not find article in RSS data' })
        return
      }
      const response = await fetch('/api/articles/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article })
      })
      if (response.ok) {
        fetchArticles()
      } else {
        showNotification({ type: 'error', title: 'Selection failed', message: `Server error: ${response.status}` })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Error selecting article' })
    }
  }

  const deselectArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        fetchArticles()
      } else {
        showNotification({ type: 'error', title: 'Deselect failed', message: `Server error: ${response.status}` })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Error deselecting article' })
    }
  }

  const addArticleFromUrl = async () => {
    if (!newArticleUrl.trim()) {
      showNotification({ type: 'error', title: 'URL required', message: 'Please enter a URL' })
      return
    }
    setIsAddingArticle(true)
    try {
      const response = await fetch('/api/articles/add-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newArticleUrl, category: newArticleCategory })
      })
      if (response.ok) {
        showNotification({ type: 'success', title: 'Article added', message: 'Article successfully added to pending' })
        setShowAddArticleModal(false)
        setNewArticleUrl('')
        fetchArticles()
      } else {
        const error = await response.json()
        showNotification({ type: 'error', title: 'Failed to add article', message: error.details || error.error })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Failed to add article' })
    } finally {
      setIsAddingArticle(false)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'border-amber-200 text-amber-700',
      selected: 'border-indigo-200 text-indigo-700',
      rewritten: 'border-emerald-200 text-emerald-700',
      published: 'border-slate-200 text-slate-600',
    }
    const dotStyles: Record<string, string> = {
      pending: 'bg-amber-400',
      selected: 'bg-indigo-400',
      rewritten: 'bg-emerald-400',
      published: 'bg-slate-400',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[status] || styles.published}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotStyles[status] || dotStyles.published}`}></span>
        {status}
      </span>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Articles</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddArticleModal(true)}
            className="inline-flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Article
          </button>
          <button
            onClick={refreshArticles}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Articles'}
            {cacheStatus && cacheStatus.isStale && (
              <span className="ml-1.5 w-2 h-2 bg-amber-300 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      <div>
        {/* Filters */}
        <div className="mb-6 bg-white p-5 rounded-lg border border-slate-200">
          {/* Status pills */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-500 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'selected', label: 'Selected' },
                { value: 'rewritten', label: 'Rewritten' }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    selectedStatus === status.value
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status.label}
                  {status.value !== 'all' && (
                    <span className={`ml-1.5 text-xs font-semibold ${selectedStatus === status.value ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {filteredArticles.filter(a => a.status === status.value).length || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-500 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {['cybersecurity', 'bouwcertificaten', 'ai-companion', 'marketingtoolz'].map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    selectedCategories.includes(category)
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {selectedCategories.includes(category) && <Check className="w-3.5 h-3.5 mr-1.5" />}
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Language + Keyword toggle */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Language</label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'nl', label: 'NL' },
                  { value: 'international', label: 'International' }
                ].map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguageFilter(lang.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      languageFilter === lang.value
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-auto p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <span className="text-sm font-medium text-slate-700">Keyword Filtering</span>
                <p className="text-xs text-slate-500">
                  {keywordFiltering ? 'Matching keywords only' : 'All articles'}
                </p>
              </div>
              <button
                onClick={() => {
                  setKeywordFiltering(!keywordFiltering)
                  if (hasLoadedOnce) setTimeout(() => fetchArticles(true), 100)
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  keywordFiltering ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={keywordFiltering}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${keywordFiltering ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-500">Loading articles...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-sm transition-all group">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    {statusBadge(article.status)}
                    <span className="text-xs text-slate-400">{article.source}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2 leading-snug">
                    {article.title}
                  </h3>

                  <p className="text-slate-500 text-xs mb-3 line-clamp-3 leading-relaxed">
                    {article.description}
                  </p>

                  {/* Keyword tags */}
                  {(article as any).matchedKeywords && (article as any).matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(article as any).matchedKeywords.slice(0, 3).map((keyword: string) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border border-slate-200 text-slate-500"
                        >
                          {keyword}
                        </span>
                      ))}
                      {(article as any).matchedKeywords.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{(article as any).matchedKeywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {new Date(article.publishedAt).toLocaleDateString('nl-NL')}
                    </span>

                    <div className="flex space-x-1.5">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>

                      {article.status === 'pending' && (
                        <button
                          onClick={() => selectArticle(article.url || article.id!)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Select
                        </button>
                      )}

                      {article.status === 'selected' && (
                        <>
                          <a
                            href={`/dashboard/rewrite/${article.id}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                          >
                            <PenLine className="w-3 h-3 mr-1" />
                            Rewrite
                          </a>
                          <button
                            onClick={() => deselectArticle(article.id!)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                          </button>
                        </>
                      )}

                      {article.status === 'rewritten' && (
                        <a
                          href={`/dashboard/rewrite/${article.id}`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-50 transition-colors"
                        >
                          <FileText className="w-3 h-3 mr-1" />
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

        {!loading && !hasLoadedOnce && (
          <div className="text-center py-16">
            <RefreshCw className="mx-auto h-10 w-10 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-900 mb-2">Welcome to News Pal</h3>
            <p className="text-slate-500 mb-6 text-sm">Select categories above and click &quot;Refresh Articles&quot; to load the latest news.</p>
            <button
              onClick={refreshArticles}
              disabled={refreshing || selectedCategories.length === 0}
              className="inline-flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {selectedCategories.length === 0 ? 'Select categories first' : 'Get Started'}
            </button>
          </div>
        )}

        {!loading && hasLoadedOnce && selectedCategories.length === 0 && (
          <div className="text-center py-16">
            <Filter className="mx-auto h-10 w-10 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-900 mb-2">No categories selected</h3>
            <p className="text-slate-500 text-sm">Please select one or more categories above to view articles.</p>
          </div>
        )}

        {!loading && hasLoadedOnce && selectedCategories.length > 0 && filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <FileText className="mx-auto h-10 w-10 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-900 mb-2">No articles found</h3>
            <p className="text-slate-500 text-sm">Try adjusting filters, refreshing articles, or adding RSS feeds in Settings.</p>
          </div>
        )}
      </div>

      {/* Add Article Modal */}
      {showAddArticleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-slate-900">Add Article from URL</h2>
              <button onClick={() => setShowAddArticleModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Article URL</label>
                <input
                  type="url"
                  value={newArticleUrl}
                  onChange={(e) => setNewArticleUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Category</label>
                <select
                  value={newArticleCategory}
                  onChange={(e) => setNewArticleCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="cybersecurity">Cybersecurity</option>
                  <option value="bouwcertificaten">Bouwcertificaten</option>
                  <option value="ai-companion">AI Companion</option>
                  <option value="marketingtoolz">Marketingtoolz</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowAddArticleModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addArticleFromUrl}
                  disabled={isAddingArticle}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isAddingArticle ? 'Adding...' : 'Add Article'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
