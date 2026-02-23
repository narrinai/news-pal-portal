'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '../../../../components/NotificationSystem'
import { Plus, Trash2 } from 'lucide-react'

interface Settings {
  categories: string[]
  categoryKeywords: { [category: string]: string[] }
  rewriteInstructions: { [key: string]: string }
}

export default function CategoriesPage() {
  const { showNotification, showPrompt } = useNotifications()
  const [settings, setSettings] = useState<Settings>({
    categories: [],
    categoryKeywords: {},
    rewriteInstructions: {}
  })

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

  const addCategory = async () => {
    const newCategory = await showPrompt({
      title: 'New category',
      message: 'Enter the name of the new category:',
      promptPlaceholder: 'Category name...',
      confirmText: 'Add',
      cancelText: 'Cancel'
    })
    if (newCategory && !settings.categories.includes(newCategory)) {
      const updatedSettings = { ...settings, categories: [...settings.categories, newCategory] }
      setSettings(updatedSettings)
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        })
        showNotification({ type: 'success', title: 'Category added & saved', message: `"${newCategory}" has been added`, duration: 3000 })
      } catch (error) {
        showNotification({ type: 'error', title: 'Save failed', message: 'Category added but not saved' })
      }
    } else if (newCategory && settings.categories.includes(newCategory)) {
      showNotification({ type: 'warning', title: 'Category exists', message: `"${newCategory}" already exists` })
    }
  }

  const removeCategory = async (category: string) => {
    const updatedSettings = { ...settings, categories: settings.categories.filter(c => c !== category) }
    setSettings(updatedSettings)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
    } catch (error) {
      console.error('Error auto-saving categories:', error)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Categories</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base font-medium text-slate-900">Article Categories</h2>
          <button
            onClick={addCategory}
            className="inline-flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </button>
        </div>
        <div className="space-y-2">
          {settings.categories.map((category) => (
            <div key={category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-medium text-slate-700">{category}</span>
              <button
                onClick={() => removeCategory(category)}
                className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
