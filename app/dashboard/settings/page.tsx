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
    url: string
    name: string
    category: string
    enabled: boolean
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
  
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'instructions' | 'feeds'>('categories')
  const router = useRouter()

  useEffect(() => {
    loadSettings()
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">RSS Feed Configuratie</h2>
            <div className="text-gray-600">
              <p className="mb-4">Hier kun je later RSS feeds toevoegen, bewerken en in-/uitschakelen.</p>
              <p className="text-sm">Feature komt binnenkort beschikbaar...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}