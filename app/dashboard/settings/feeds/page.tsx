'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '../../../../components/NotificationSystem'
import { Plus, Trash2, X, Rss, Info } from 'lucide-react'

export default function FeedsPage() {
  const { showNotification, showConfirm } = useNotifications()
  const [feeds, setFeeds] = useState<any[]>([])
  const [feedsLoading, setFeedsLoading] = useState(true)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [newFeed, setNewFeed] = useState({
    url: '',
    name: '',
    category: 'cybersecurity',
    maxArticles: 25
  })

  useEffect(() => {
    loadFeeds()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadFeeds = async () => {
    setFeedsLoading(true)
    try {
      const response = await fetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data)
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
        setFeeds(feeds)
        showNotification({ type: 'error', title: 'Save failed', message: 'Could not save feed status' })
      }
    } catch (error) {
      setFeeds(feeds)
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    }
  }

  const addFeed = async () => {
    if (!newFeed.url || !newFeed.name) {
      showNotification({ type: 'warning', title: 'Fields required', message: 'URL and name are required to add an RSS feed' })
      return
    }
    try {
      const response = await fetch('/api/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFeed, enabled: true })
      })
      if (response.ok) {
        const result = await response.json()
        setFeeds(prev => [result.feed, ...prev])
        setNewFeed({ url: '', name: '', category: 'cybersecurity', maxArticles: 25 })
        setShowAddFeed(false)
        showNotification({ type: 'success', title: 'RSS feed added', message: `${newFeed.name} has been successfully added`, duration: 4000 })
      } else {
        showNotification({ type: 'error', title: 'Add failed', message: 'Could not add RSS feed' })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not add RSS feed' })
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
        showNotification({ type: 'success', title: 'Feed removed', message: `${feedToRemove?.name} has been successfully removed`, duration: 4000 })
      } else {
        showNotification({ type: 'error', title: 'Remove failed', message: 'Could not remove RSS feed' })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">RSS Feeds</h1>
        <button
          onClick={() => setShowAddFeed(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add RSS Feed
        </button>
      </div>

      {showAddFeed && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add New RSS Feed</h3>
              <p className="text-sm text-slate-500 mt-1">We&apos;ll automatically detect and use the RSS feed</p>
            </div>
            <button onClick={() => setShowAddFeed(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Feed Name</label>
              <input
                type="text"
                value={newFeed.name}
                onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. TechCrunch Security"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Feed URL</label>
              <input
                type="url"
                value={newFeed.url}
                onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://example.com/feed"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Category</label>
                <select
                  value={newFeed.category}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Max Articles</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={newFeed.maxArticles}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, maxArticles: parseInt(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddFeed(false)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addFeed}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
              >
                Add Feed
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            {feedsLoading ? 'Loading feeds...' : `${feeds.length} feeds configured \u00b7 ${feeds.filter(f => f.enabled).length} active`}
          </p>
        </div>

        {feedsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-slate-500">Loading feeds...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <div key={feed.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">{feed.name}</div>
                  <div className="text-sm text-slate-400 truncate">{feed.url}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {feed.category} &middot; Max {feed.maxArticles || 25} articles
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleFeed(feed.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      feed.enabled ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'
                    }`}
                    role="switch"
                    aria-checked={feed.enabled}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feed.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <button
                    onClick={() => removeFeed(feed.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {feeds.length === 0 && !feedsLoading && (
              <div className="text-center py-12 text-slate-400">
                <Rss className="mx-auto h-10 w-10 text-slate-300 mb-4" />
                <p className="text-base font-medium text-slate-500">No RSS feeds configured</p>
                <p className="mt-1 text-sm">Add your first feed to start collecting articles</p>
                <button
                  onClick={() => setShowAddFeed(true)}
                  className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Add Your First Feed
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-50 rounded-lg border border-slate-100 p-6">
        <h3 className="font-medium text-slate-700 mb-3 flex items-center">
          <Info className="w-4 h-4 mr-2 text-slate-400" />
          How RSS feed management works
        </h3>
        <div className="text-sm text-slate-500 space-y-1.5">
          <p>All feed configurations are stored in Airtable</p>
          <p>Changes sync immediately</p>
          <p>Only enabled feeds are processed during article collection</p>
          <p>Add or remove feeds without touching code</p>
        </div>
      </div>
    </div>
  )
}
