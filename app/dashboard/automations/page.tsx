'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../../components/NotificationSystem'
import { Plus, Zap, ZapOff, Globe, FileText, Trash2 } from 'lucide-react'

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
  const { showNotification, showPrompt, showConfirm } = useNotifications()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [articleCounts, setArticleCounts] = useState<Record<string, { total: number, selected: number, published: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAutomations()
  }, [])

  const loadAutomations = async () => {
    try {
      const res = await fetch('/api/automations')
      if (res.ok) {
        const data = await res.json()
        setAutomations(data)
        // Fetch article counts for each automation
        data.forEach(async (a: Automation) => {
          try {
            const r = await fetch(`/api/articles/by-automation?automation_id=${a.id}`)
            if (r.ok) {
              const d = await r.json()
              setArticleCounts(prev => ({ ...prev, [a.id]: d.counts }))
            }
          } catch {}
        })
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
      promptPlaceholder: 'e.g. Marketingtoolz.com News',
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

  const deleteAutomation = async (automation: Automation) => {
    const confirmed = await showConfirm({
      title: 'Delete automation',
      message: `Are you sure you want to delete "${automation.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setDeletingId(automation.id)
    try {
      const res = await fetch(`/api/automations/${automation.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== automation.id))
        showNotification({ type: 'success', title: 'Deleted', message: `"${automation.name}" has been deleted`, duration: 3000 })
      } else {
        showNotification({ type: 'error', title: 'Failed', message: 'Could not delete automation' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    } finally {
      setDeletingId(null)
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
        <div className="grid gap-2">
          {automations.map((automation) => {
            const counts = articleCounts[automation.id]
            const scheduled = counts ? counts.selected + counts.published : 0
            return (
              <div
                key={automation.id}
                className={`group bg-white rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-300 transition-colors cursor-pointer ${deletingId === automation.id ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => router.push(`/dashboard/automations/${automation.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{automation.name}</h3>
                    {automation.enabled ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                        <ZapOff className="w-2.5 h-2.5 mr-0.5" />Off
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {automation.articles_per_day}/{(automation.publish_frequency || 'daily').replace('every-', '').replace('-days', 'd').replace('biweekly', '2wk').replace('monthly', 'mo').replace('weekly', 'wk').replace('daily', 'day')}
                    </span>
                    <span className="text-xs text-slate-400">{automation.language === 'nl' ? 'NL' : 'EN'}</span>
                    {automation.site_name && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Globe className="w-2.5 h-2.5" />
                        {automation.site_name}
                      </span>
                    )}
                    {scheduled > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/automations/${automation.id}#articles`) }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {scheduled}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAutomation(automation) }}
                      className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete automation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleEnabled(automation) }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        automation.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={automation.enabled}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${automation.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
