'use client'

import { useState, useEffect } from 'react'
import { NewsArticle } from '../../lib/airtable'

export default function DashboardPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('pending')

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory, selectedStatus])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      
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

  const fetchNewArticles = async () => {
    setFetching(true)
    try {
      const response = await fetch('/api/articles/fetch', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        alert(`${result.newArticles} nieuwe artikelen toegevoegd`)
        fetchArticles() // Refresh the list
      }
    } catch (error) {
      console.error('Error fetching new articles:', error)
      alert('Fout bij ophalen van nieuwe artikelen')
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
        alert(`Fout bij selecteren: ${response.status}`)
      }
    } catch (error) {
      console.error('Error selecting article:', error)
      alert('Netwerkfout bij selecteren van artikel')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">News Pal Portal</h1>
            <button
              onClick={fetchNewArticles}
              disabled={fetching}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {fetching ? 'Ophalen...' : 'Nieuwe Artikelen Ophalen'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="all">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="selected">Selected</option>
            <option value="rewritten">Rewritten</option>
            <option value="published">Published</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="all">Alle categorieën</option>
            <option value="cybersecurity-nl">Cybersecurity NL</option>
            <option value="cybersecurity-international">Cybersecurity International</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Artikelen laden...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    article.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    article.status === 'selected' ? 'bg-blue-100 text-blue-800' :
                    article.status === 'rewritten' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {article.status}
                  </span>
                  <span className="text-xs text-gray-500">{article.source}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(article.publishedAt).toLocaleDateString('nl-NL')}
                  </span>
                  
                  <div className="flex space-x-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Bekijk
                    </a>
                    
                    {article.status === 'pending' && (
                      <button
                        onClick={() => selectArticle(article.id!)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Selecteer
                      </button>
                    )}
                    
                    {article.status === 'selected' && (
                      <a
                        href={`/dashboard/rewrite/${article.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Herschrijf
                      </a>
                    )}
                    
                    {article.status === 'rewritten' && (
                      <a
                        href={`/dashboard/rewrite/${article.id}`}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Bekijk
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Geen artikelen gevonden</p>
          </div>
        )}
      </div>
    </div>
  )
}