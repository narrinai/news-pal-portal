'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  categories: string[]
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
  const [settings, setSettings] = useState<Settings>({
    categories: ['cybersecurity-nl', 'cybersecurity-international', 'tech-nl', 'tech-international', 'other'],
    rewriteInstructions: {
      general: 'Herschrijf dit artikel naar helder Nederlands voor een technische doelgroep. Behoud alle belangrijke feiten en cijfers.',
      professional: 'Gebruik een zakelijke, professionele toon. Focus op de business impact en relevantie.',
      engaging: 'Schrijf op een boeiende manier die lezers betrekt. Gebruik voorbeelden en maak het toegankelijk.',
      technical: 'Gebruik technische precisie en gedetailleerde uitleg. Voeg technische context toe waar relevant.'
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
  const [activeTab, setActiveTab] = useState<'categories' | 'instructions' | 'feeds'>('categories')
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
        setSettings(prev => ({ ...prev, rssFeeds: feeds }))
      }
    } catch (error) {
      console.error('Error loading feeds:', error)
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
        alert('Instellingen opgeslagen!')
      } else {
        alert('Fout bij opslaan instellingen')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Netwerkfout bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  const addCategory = () => {
    const newCategory = prompt('Nieuwe categorie naam:')
    if (newCategory && !settings.categories.includes(newCategory)) {
      setSettings(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }))
    }
  }

  const removeCategory = (category: string) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }))
  }

  const updateInstruction = (type: keyof typeof settings.rewriteInstructions, value: string) => {
    setSettings(prev => ({
      ...prev,
      rewriteInstructions: {
        ...prev.rewriteInstructions,
        [type]: value
      }
    }))
  }

  const addFeed = async () => {
    if (!newFeed.url || !newFeed.name) {
      alert('URL en naam zijn verplicht')
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
        await loadFeeds()
        setNewFeed({ url: '', name: '', category: 'cybersecurity-international', maxArticles: 10 })
        setShowAddFeed(false)
        alert('RSS feed toegevoegd!')
      } else {
        const error = await response.json()
        alert(`Fout: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding feed:', error)
      alert('Netwerkfout bij toevoegen feed')
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
      } else {
        alert('Fout bij opslaan feed status')
      }
    } catch (error) {
      console.error('Error toggling feed:', error)
      alert('Netwerkfout')
    }
  }

  const removeFeed = async (feedId: string) => {
    if (!confirm('Weet je zeker dat je deze RSS feed wilt verwijderen?')) return

    const updatedFeeds = settings.rssFeeds.filter(feed => feed.id !== feedId)
    
    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, rssFeeds: updatedFeeds }))
        alert('RSS feed verwijderd!')
      } else {
        alert('Fout bij verwijderen feed')
      }
    } catch (error) {
      console.error('Error removing feed:', error)
      alert('Netwerkfout')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary-600 hover:text-primary-700 mb-2"
              >
                ← Terug naar dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'categories', label: 'Categorieën' },
              { id: 'instructions', label: 'AI Instructies' },
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
              <h2 className="text-xl font-semibold">Artikel Categorieën</h2>
              <button
                onClick={addCategory}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                + Categorie Toevoegen
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
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Instructions Tab */}
        {activeTab === 'instructions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">AI Herschrijf Instructies</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Algemene Instructie
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
                  Professionele Stijl
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
                  Boeiende Stijl
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
                  Technische Stijl
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
            {/* Active Feeds */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">RSS Feed Bronnen</h2>
                <button
                  onClick={() => setShowAddFeed(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  + Feed Toevoegen
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
                            {feed.category} • Max {feed.maxArticles || 10} artikelen
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
                        {feed.enabled ? 'Actief' : 'Inactief'}
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
                    Geen RSS feeds geconfigureerd. Voeg er een toe om te beginnen!
                  </div>
                )}
              </div>
            </div>

            {/* Add Feed Form */}
            {showAddFeed && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Nieuwe RSS Feed Toevoegen</h3>
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
                      Feed Naam
                    </label>
                    <input
                      type="text"
                      value={newFeed.name}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Bijv. TechCrunch Security"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RSS Feed URL
                    </label>
                    <input
                      type="url"
                      value={newFeed.url}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="https://example.com/rss.xml"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categorie
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
                        Max Artikelen
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
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={addFeed}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                    >
                      Feed Toevoegen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search Process Explanation */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">🔍 Hoe de zoekfunctie werkt:</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div><strong>1. RSS Feeds:</strong> Alleen actieve feeds worden doorlopen</div>
                <div><strong>2. Artikel limiet:</strong> Per feed max aantal artikelen (instelbaar)</div>
                <div><strong>3. Keyword filtering:</strong> Automatische selectie op 20+ cybersecurity termen</div>
                <div><strong>4. Duplicaat check:</strong> URL-based filtering</div>
                <div><strong>5. Airtable opslag:</strong> Status "pending" voor handmatige selectie</div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-md">
                <div className="font-medium text-blue-900 mb-1">🎯 Keywords die gebruikt worden:</div>
                <div className="text-xs text-blue-700">
                  security, cybersecurity, hack, breach, malware, ransomware, phishing, vulnerability, exploit, 
                  beveiliging, cyberbeveiliging, datalek, privacy, encryptie... (20+ termen)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}