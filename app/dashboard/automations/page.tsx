'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../../components/NotificationSystem'
import { Plus, Zap, ZapOff, Globe } from 'lucide-react'

interface Automation {
  id: string
  name: string
  enabled: boolean
  articles_per_day: number
  publish_frequency?: string
  categories: string
  style: string
  length: string
  language: string
  site_name?: string
  site_url?: string
}

export default function AutomationsPage() {
  const router = useRouter()
  const { showNotification, showPrompt } = useNotifications()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAutomations()
  }, [])

  const loadAutomations = async () => {
    try {
      const res = await fetch('/api/automations')
      if (res.ok) {
        setAutomations(await res.json())
      }
    } catch (error) {
      console.error('Error loading automations:', error)
    } finally {
      setLoading(false)
    }
  }

  const addAutomation = async () => {
    const name = await showPrompt({
      title: 'New automation',
      message: 'Enter a name for the new automation:',
      promptPlaceholder: 'e.g. Marketing AI Hub',
      confirmText: 'Create',
      cancelText: 'Cancel',
    })
    if (!name) return

    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled: false }),
      })
      if (res.ok) {
        const created = await res.json()
        showNotification({ type: 'success', title: 'Automation created', message: `"${name}" has been created`, duration: 3000 })
        router.push(`/dashboard/automations/${created.id}`)
      } else {
        showNotification({ type: 'error', title: 'Failed', message: 'Could not create automation' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    }
  }

  const toggleEnabled = async (automation: Automation) => {
    const updated = { ...automation, enabled: !automation.enabled }
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: updated.enabled }),
      })
      if (res.ok) {
        setAutomations(prev => prev.map(a => a.id === automation.id ? { ...a, enabled: updated.enabled } : a))
      }
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-sm text-slate-500">Loading automations...</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Automations</h1>
        <button
          onClick={addAutomation}
          className="inline-flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500 mb-4">No automations yet. Create one to start publishing automatically.</p>
          <button
            onClick={addAutomation}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Automation
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => {
            const cats = automation.categories ? automation.categories.split(',').map(c => c.trim()).filter(Boolean) : []
            return (
              <div
                key={automation.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/automations/${automation.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 truncate">{automation.name}</h3>
                      {automation.enabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Zap className="w-3 h-3 mr-1" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          <ZapOff className="w-3 h-3 mr-1" />Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{automation.articles_per_day} articles/{(automation.publish_frequency || 'daily').replace('every-', '').replace('-days', 'd').replace('biweekly', '2wk').replace('monthly', 'mo').replace('weekly', 'wk').replace('daily', 'day')}</span>
                      <span>{automation.language === 'nl' ? 'Dutch' : 'English'}</span>
                      <span className="capitalize">{automation.length}</span>
                    </div>
                    {cats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cats.map(cat => (
                          <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                    {automation.site_name && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Globe className="w-3 h-3" />
                          {automation.site_name}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEnabled(automation) }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-4 ${
                      automation.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={automation.enabled}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${automation.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
