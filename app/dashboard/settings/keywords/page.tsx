'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '../../../../components/NotificationSystem'
import { Plus, X, Info } from 'lucide-react'

interface Settings {
  categories: string[]
  categoryKeywords: { [category: string]: string[] }
  rewriteInstructions: { [key: string]: string }
}

export default function KeywordsPage() {
  const { showNotification, showPrompt } = useNotifications()
  const [settings, setSettings] = useState<Settings>({
    categories: [],
    categoryKeywords: {},
    rewriteInstructions: {}
  })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
        if (!selectedCategory && data.categories?.length > 0) {
          setSelectedCategory(data.categories[0])
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async (updatedSettings: Settings) => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
    } catch (error) {
      console.error('Error auto-saving keywords:', error)
    } finally {
      setSaving(false)
    }
  }

  const addKeyword = async (category: string) => {
    const newKeywords = await showPrompt({
      title: 'New keyword(s)',
      message: `Enter keyword(s) for "${category}" (comma-separated):`,
      promptPlaceholder: 'keyword1, keyword2, keyword3...',
      confirmText: 'Add',
      cancelText: 'Cancel'
    })
    if (!newKeywords) return
    const keywordsArray = newKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
    const categoryKeywords = settings.categoryKeywords[category] || []
    const newUniqueKeywords = keywordsArray.filter(k => !categoryKeywords.includes(k))
    const duplicates = keywordsArray.filter(k => categoryKeywords.includes(k))
    if (newUniqueKeywords.length > 0) {
      const updatedSettings = {
        ...settings,
        categoryKeywords: {
          ...settings.categoryKeywords,
          [category]: [...categoryKeywords, ...newUniqueKeywords]
        }
      }
      setSettings(updatedSettings)
      saveSettings(updatedSettings)
      showNotification({
        type: 'success',
        title: `${newUniqueKeywords.length} keyword${newUniqueKeywords.length > 1 ? 's' : ''} added`,
        message: `Added: ${newUniqueKeywords.join(', ')}${duplicates.length > 0 ? ` (${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} skipped)` : ''}`,
        duration: 4000
      })
    } else if (duplicates.length > 0) {
      showNotification({ type: 'warning', title: 'All keywords exist', message: 'All entered keywords already exist in this category' })
    }
  }

  const removeKeyword = (category: string, keyword: string) => {
    const updatedSettings = {
      ...settings,
      categoryKeywords: {
        ...settings.categoryKeywords,
        [category]: (settings.categoryKeywords[category] || []).filter(k => k !== keyword)
      }
    }
    setSettings(updatedSettings)
    saveSettings(updatedSettings)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Keywords</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mt-1">Manage keywords for each category to filter relevant articles</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-500 mb-2">Select Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            {settings.categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-slate-800">Keywords for &ldquo;{selectedCategory}&rdquo;</h3>
              <button
                onClick={() => addKeyword(selectedCategory)}
                className="inline-flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Keyword
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {(settings.categoryKeywords[selectedCategory] || []).map((keyword) => (
                <div key={keyword} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 group">
                  <span className="text-sm text-slate-700">{keyword}</span>
                  <button
                    onClick={() => removeKeyword(selectedCategory, keyword)}
                    className="text-red-400 hover:text-red-600 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {(!settings.categoryKeywords[selectedCategory] || settings.categoryKeywords[selectedCategory].length === 0) && (
              <div className="text-center py-8 text-slate-400">
                No keywords for this category yet. Add some to start filtering articles.
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <h3 className="font-medium text-slate-700 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2 text-slate-400" />
            How category-based filtering works
          </h3>
          <div className="text-sm text-slate-500 space-y-1">
            <p>Each category has its own set of keywords for precise filtering</p>
            <p>Articles are matched to categories based on their keywords</p>
            <p>Case-insensitive matching in title and description</p>
            <p>Support both English and Dutch keywords</p>
          </div>
        </div>
      </div>
    </div>
  )
}
