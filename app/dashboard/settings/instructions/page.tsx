'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '../../../../components/NotificationSystem'

interface Settings {
  categories: string[]
  categoryKeywords: { [category: string]: string[] }
  rewriteInstructions: {
    general: string
    professional: string
    engaging: string
    technical: string
    news: string
  }
}

export default function InstructionsPage() {
  const { showNotification } = useNotifications()
  const [settings, setSettings] = useState<Settings>({
    categories: [],
    categoryKeywords: {},
    rewriteInstructions: {
      general: '',
      professional: '',
      engaging: '',
      technical: '',
      news: ''
    }
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

  const updateInstruction = async (type: keyof Settings['rewriteInstructions'], value: string) => {
    const updatedSettings = {
      ...settings,
      rewriteInstructions: { ...settings.rewriteInstructions, [type]: value }
    }
    setSettings(updatedSettings)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
    } catch (error) {
      console.error('Error auto-saving AI instructions:', error)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">AI Instructions</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="space-y-6">
          {[
            { key: 'general', label: 'General Instructions' },
            { key: 'professional', label: 'Professional Style' },
            { key: 'engaging', label: 'Engaging Style' },
            { key: 'technical', label: 'Technical Style' },
            { key: 'news', label: 'News Style' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-500 mb-2">{label}</label>
              <textarea
                value={settings.rewriteInstructions[key as keyof Settings['rewriteInstructions']]}
                onChange={(e) => updateInstruction(key as keyof Settings['rewriteInstructions'], e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
