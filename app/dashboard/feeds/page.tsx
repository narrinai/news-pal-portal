'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../../components/NotificationSystem'
import Logo from '../../../components/Logo'

interface RSSFeed {
  id: string
  url: string
  name: string
  category: string
  enabled: boolean
  maxArticles?: number
}

export default function FeedsPage() {
  const { showNotification, showConfirm } = useNotifications()
  const router = useRouter()

  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({
    url: '',
    name: '',
    category: 'cybersecurity',
    maxArticles: 25
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeeds()
    loadCategories()
  }, [])

  const loadFeeds = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded feeds:', data.length)
        setFeeds(data)
      } else {
        console.error('Failed to load feeds:', response.status)
      }
    } catch (error) {
      console.error('Error loading feeds:', error)
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Could not load RSS feeds'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || ['cybersecurity', 'bouwcertificaten', 'ai-companion', 'ai-learning', 'marketingtoolz'])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories(['cybersecurity', 'bouwcertificaten', 'ai-companion', 'ai-learning', 'marketingtoolz'])
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
    const updatedFeeds = feeds.map(feed =>
      feed.id === feedId ? { ...feed, enabled: !feed.enabled } : feed
    )

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        setFeeds(updatedFeeds)
        const toggledFeed = updatedFeeds.find(f => f.id === feedId)
        showNotification({
          type: 'success',
          title: toggledFeed?.enabled ? 'Feed enabled' : 'Feed disabled',
          message: `${toggledFeed?.name} is now ${toggledFeed?.enabled ? 'enabled' : 'disabled'}`,
          duration: 3000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Could not save feed status'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Logo size="lg" className="mr-4" clickable={true} href="/dashboard" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RSS Feeds</h1>
                <p className="text-sm text-gray-600">Manage your RSS feed sources for article collection</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    {categories.map(cat => (
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
                {loading ? 'Loading feeds...' : `${feeds.length} feeds configured • ${feeds.filter(f => f.enabled).length} active`}
              </p>
            </div>
            <button
              onClick={() => setShowAddFeed(true)}
              className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              + Add RSS Feed
            </button>
          </div>

          {loading ? (
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

              {feeds.length === 0 && !loading && (
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
      </div>
    </div>
  )
}