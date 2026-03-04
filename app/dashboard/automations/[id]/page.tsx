'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNotifications } from '../../../../components/NotificationSystem'
import { ArrowLeft, Check, Trash2, Copy, Plus, X, Rss, Shield, Building2, Bot, GraduationCap, Megaphone, Globe, ExternalLink, Link, Search, Loader2, Code, ChevronDown } from 'lucide-react'

interface Automation {
  id: string
  name: string
  enabled: boolean
  articles_per_day: number
  publish_frequency: string
  categories: string
  style: string
  length: string
  language: string
  keywords: string
  feeds: string
  site_name: string
  site_url: string
  site_example_url: string
  site_template: string
  site_detail_template: string
  integration_type: string
  deploy_webhook_url: string
}

interface Feed {
  id: string
  name: string
  url: string
  category: string
  enabled: boolean
}

export default function AutomationEditPage() {
  const params = useParams()
  const router = useRouter()
  const { showNotification, showConfirm, showPrompt } = useNotifications()
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [globalKeywords, setGlobalKeywords] = useState<{ [cat: string]: string[] }>({})
  const [allFeeds, setAllFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [showAdvancedIntegration, setShowAdvancedIntegration] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) {
      loadAutomation()
      loadCategories()
      loadFeeds()
    }
  }, [id])

  const loadAutomation = async () => {
    try {
      const res = await fetch(`/api/automations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setAutomation({
          ...data,
          publish_frequency: data.publish_frequency || 'daily',
          keywords: data.keywords || '',
          feeds: data.feeds || '',
          site_name: data.site_name || '',
          site_url: data.site_url || '',
          site_example_url: data.site_example_url || '',
          site_template: data.site_template || '',
          site_detail_template: data.site_detail_template || '',
          integration_type: data.integration_type || '',
          deploy_webhook_url: data.deploy_webhook_url || '',
        })
      } else {
        showNotification({ type: 'error', title: 'Not found', message: 'Automation not found' })
        router.push('/dashboard/automations')
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not load automation' })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setAllCategories(data.categories || [])
        setGlobalKeywords(data.categoryKeywords || {})
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadFeeds = async () => {
    try {
      const res = await fetch('/api/feeds')
      if (res.ok) setAllFeeds(await res.json())
    } catch (error) {
      console.error('Error loading feeds:', error)
    }
  }

  // Keywords helpers
  const getKeywordsMap = (): { [cat: string]: string[] } => {
    if (!automation?.keywords) return {}
    try { return JSON.parse(automation.keywords) } catch { return {} }
  }

  const getKeywordsForCategory = (cat: string): string[] => {
    const map = getKeywordsMap()
    return map[cat] || globalKeywords[cat] || []
  }

  const setKeywordsForCategory = (cat: string, keywords: string[]) => {
    const map = getKeywordsMap()
    map[cat] = keywords
    update('keywords', JSON.stringify(map))
  }

  const addKeyword = async (cat: string) => {
    const input = await showPrompt({
      title: 'New keyword(s)',
      message: `Enter keyword(s) for "${cat}" (comma-separated):`,
      promptPlaceholder: 'keyword1, keyword2...',
      confirmText: 'Add',
      cancelText: 'Cancel',
    })
    if (!input) return
    const current = getKeywordsForCategory(cat)
    const newKws = input.split(',').map(k => k.trim().toLowerCase()).filter(k => k && !current.includes(k))
    if (newKws.length > 0) {
      setKeywordsForCategory(cat, [...current, ...newKws])
      showNotification({ type: 'success', title: `${newKws.length} keyword(s) added`, message: newKws.join(', '), duration: 3000 })
    }
  }

  const removeKeyword = (cat: string, keyword: string) => {
    setKeywordsForCategory(cat, getKeywordsForCategory(cat).filter(k => k !== keyword))
  }

  // Feeds helpers
  const getSelectedFeedIds = (): string[] => {
    if (!automation?.feeds) return []
    return automation.feeds.split(',').filter(Boolean)
  }

  const toggleFeed = (feedId: string) => {
    const current = getSelectedFeedIds()
    const updated = current.includes(feedId) ? current.filter(f => f !== feedId) : [...current, feedId]
    update('feeds', updated.join(','))
  }

  // Category as template: toggle category + auto-select its feeds
  const toggleCategory = (cat: string) => {
    if (!automation) return
    const currentCats = automation.categories.split(',').map(c => c.trim()).filter(Boolean)
    const isActive = currentCats.includes(cat)
    const updatedCats = isActive ? currentCats.filter(c => c !== cat) : [...currentCats, cat]

    const relatedFeedIds = allFeeds.filter(f => f.category === cat).map(f => f.id)
    const currentFeeds = getSelectedFeedIds()
    const updatedFeeds = isActive
      ? currentFeeds.filter(id => !relatedFeedIds.includes(id))
      : Array.from(new Set([...currentFeeds, ...relatedFeedIds]))

    setAutomation(prev => prev ? {
      ...prev,
      categories: updatedCats.join(','),
      feeds: updatedFeeds.join(','),
    } : prev)
  }

  const save = async (overrides?: Partial<Automation>) => {
    if (!automation) return
    setSaving(true)
    try {
      const merged = overrides ? { ...automation, ...overrides } : automation
      const { id: _id, ...fields } = merged
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Saved', message: 'Automation settings saved', duration: 3000 })
      } else {
        showNotification({ type: 'error', title: 'Save failed', message: 'Could not save automation' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    } finally {
      setSaving(false)
    }
  }

  // Toggle enabled with auto-save
  const toggleEnabled = async () => {
    if (!automation) return
    const newEnabled = !automation.enabled
    setAutomation(prev => prev ? { ...prev, enabled: newEnabled } : prev)
    await save({ enabled: newEnabled })
  }

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete automation',
      message: `Are you sure you want to delete "${automation?.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Deleted', message: 'Automation has been deleted', duration: 3000 })
        router.push('/dashboard/automations')
      } else {
        showNotification({ type: 'error', title: 'Failed', message: 'Could not delete automation' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to server' })
    }
  }

  const update = (key: keyof Automation, value: any) => {
    setAutomation(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const copyApiUrl = () => {
    const url = `${window.location.origin}/api/articles/public?automation_id=${id}`
    navigator.clipboard.writeText(url)
    showNotification({ type: 'success', title: 'Copied', message: 'API URL copied to clipboard', duration: 2000 })
  }

  const analyzeTemplate = async () => {
    if (!automation?.site_example_url) {
      showNotification({ type: 'error', title: 'Missing URL', message: 'Enter an example article URL first' })
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/sites/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: automation.site_example_url, automation_id: id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        update('site_template', data.card_template)
        update('site_detail_template', data.detail_template)
        showNotification({ type: 'success', title: 'Template extracted', message: 'Your site\'s article styling has been saved', duration: 4000 })
      } else {
        showNotification({ type: 'error', title: 'Analysis failed', message: data.error || 'Could not extract template' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not reach analysis endpoint' })
    } finally {
      setAnalyzing(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await fetch(`/api/articles/status?automation_id=${id}`)
      const data = await res.json()
      if (data.connected) {
        showNotification({ type: 'success', title: 'Connected', message: `${data.name} is active and reachable`, duration: 3000 })
      } else {
        showNotification({ type: 'error', title: 'Not connected', message: data.error || 'Automation not found' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not test connection' })
    } finally {
      setTestingConnection(false)
    }
  }

  const triggerDeploy = async () => {
    if (!automation?.deploy_webhook_url) {
      showNotification({ type: 'error', title: 'No webhook', message: 'Set a deploy webhook URL first' })
      return
    }
    try {
      const res = await fetch(automation.deploy_webhook_url, { method: 'POST' })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Deploy triggered', message: 'Your site is rebuilding now. This usually takes 1-2 minutes.', duration: 5000 })
      } else {
        showNotification({ type: 'error', title: 'Deploy failed', message: `Webhook returned ${res.status}` })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not reach webhook URL' })
    }
  }

  if (loading) return <div className="p-6 lg:p-8"><div className="text-sm text-slate-500">Loading...</div></div>
  if (!automation) return null

  const activeCats = automation.categories.split(',').map(c => c.trim()).filter(Boolean)
  const selectedFeedIds = getSelectedFeedIds()

  // Category metadata for better visual design
  const categoryMeta: Record<string, { icon: any, color: string, label: string }> = {
    'cybersecurity': { icon: Shield, color: 'red', label: 'Cybersecurity' },
    'bouwcertificaten': { icon: Building2, color: 'amber', label: 'Bouwcertificaten' },
    'ai-companion': { icon: Bot, color: 'violet', label: 'AI Companion' },
    'ai-learning': { icon: GraduationCap, color: 'blue', label: 'AI Learning' },
    'marketingtoolz': { icon: Megaphone, color: 'pink', label: 'MarketingToolz' },
    'europeanpurpose': { icon: Globe, color: 'emerald', label: 'European Purpose' },
  }

  const colorClasses: Record<string, { active: string, inactive: string, icon: string, badge: string }> = {
    red:     { active: 'bg-red-50 border-red-200 ring-red-500/20',     inactive: 'bg-white border-slate-200', icon: 'text-red-500',     badge: 'bg-red-100 text-red-700' },
    amber:   { active: 'bg-amber-50 border-amber-200 ring-amber-500/20', inactive: 'bg-white border-slate-200', icon: 'text-amber-500',   badge: 'bg-amber-100 text-amber-700' },
    violet:  { active: 'bg-violet-50 border-violet-200 ring-violet-500/20', inactive: 'bg-white border-slate-200', icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700' },
    blue:    { active: 'bg-blue-50 border-blue-200 ring-blue-500/20',   inactive: 'bg-white border-slate-200', icon: 'text-blue-500',    badge: 'bg-blue-100 text-blue-700' },
    pink:    { active: 'bg-pink-50 border-pink-200 ring-pink-500/20',   inactive: 'bg-white border-slate-200', icon: 'text-pink-500',    badge: 'bg-pink-100 text-pink-700' },
    emerald: { active: 'bg-emerald-50 border-emerald-200 ring-emerald-500/20', inactive: 'bg-white border-slate-200', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  }

  // Toggle all feeds for a category
  const toggleAllCategoryFeeds = (cat: string) => {
    const catFeedIds = allFeeds.filter(f => f.category === cat).map(f => f.id)
    const current = getSelectedFeedIds()
    const allSelected = catFeedIds.every(id => current.includes(id))
    const updated = allSelected
      ? current.filter(id => !catFeedIds.includes(id))
      : Array.from(new Set([...current, ...catFeedIds]))
    update('feeds', updated.join(','))
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard/automations')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={automation.name}
          onChange={(e) => update('name', e.target.value)}
          className="text-lg font-semibold text-slate-900 bg-transparent border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-0 px-1 py-0.5 transition-colors flex-1 min-w-0"
        />
        <button
          onClick={toggleEnabled}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
            automation.enabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          role="switch"
          aria-checked={automation.enabled}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${automation.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <button
          onClick={() => save()}
          disabled={saving}
          className="inline-flex items-center px-4 py-1.5 bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 border border-indigo-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          title="Delete automation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5">
        {/* Settings — 4 cols */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Output Settings</h3>
            <span className="text-xs text-slate-400">How articles are rewritten and published</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Articles</label>
              <input
                type="number" min="1" max="10"
                value={automation.articles_per_day}
                onChange={(e) => update('articles_per_day', parseInt(e.target.value) || 1)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Frequency</label>
              <select value={automation.publish_frequency} onChange={(e) => update('publish_frequency', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="daily">Daily</option>
                <option value="every-2-days">Every 2 days</option>
                <option value="every-3-days">Every 3 days</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Style</label>
              <select value={automation.style} onChange={(e) => update('style', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="news">News</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Length</label>
              <select value={automation.length} onChange={(e) => update('length', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Language</label>
              <select value={automation.language} onChange={(e) => update('language', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="nl">Dutch</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories — visual cards */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Topics</h3>
            <span className="text-xs text-slate-400">{activeCats.length} active — pick which topics this automation should find and rewrite articles for</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allCategories.map((cat) => {
              const isActive = activeCats.includes(cat)
              const feedCount = allFeeds.filter(f => f.category === cat).length
              const kwCount = getKeywordsForCategory(cat).length
              const meta = categoryMeta[cat] || { icon: Rss, color: 'blue', label: cat }
              const colors = colorClasses[meta.color] || colorClasses.blue
              const Icon = meta.icon

              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? `${colors.active} ring-2 shadow-sm`
                      : `${colors.inactive} hover:border-slate-300 hover:shadow-sm`
                  }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-2.5 right-2.5">
                      <div className={`w-5 h-5 rounded-full ${colors.badge} flex items-center justify-center`}>
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? colors.badge : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pr-5">
                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                      {meta.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                        <Rss className="w-3 h-3" />
                        {feedCount} feeds
                      </span>
                      <span className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-300'}`}>&middot;</span>
                      <span className={`text-xs ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                        {kwCount} keywords
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feeds — grouped by category with select-all per category */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">RSS Feeds</h3>
            <span className="text-xs text-slate-400">{selectedFeedIds.length} / {allFeeds.length} selected</span>
          </div>

          {allFeeds.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No feeds configured yet.</p>
          ) : (
            <div className="space-y-4">
              {[...allCategories.filter(c => activeCats.includes(c)), ...allCategories.filter(c => !activeCats.includes(c))].map((cat) => {
                const catFeeds = allFeeds.filter(f => f.category === cat)
                if (catFeeds.length === 0) return null
                const isCatActive = activeCats.includes(cat)
                const selectedCount = catFeeds.filter(f => selectedFeedIds.includes(f.id)).length
                const allCatSelected = catFeeds.length > 0 && selectedCount === catFeeds.length
                const someCatSelected = selectedCount > 0 && selectedCount < catFeeds.length
                const meta = categoryMeta[cat] || { icon: Rss, color: 'blue', label: cat }
                const colors = colorClasses[meta.color] || colorClasses.blue

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* Select-all checkbox */}
                      <div
                        onClick={() => toggleAllCategoryFeeds(cat)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          allCatSelected ? 'bg-indigo-600 border-indigo-600' : someCatSelected ? 'bg-indigo-300 border-indigo-400' : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {(allCatSelected || someCatSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isCatActive ? colors.icon : 'text-slate-400'}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">{selectedCount}/{catFeeds.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 ml-6">
                      {catFeeds.map((feed) => {
                        const isSelected = selectedFeedIds.includes(feed.id)
                        return (
                          <div
                            key={feed.id}
                            onClick={() => toggleFeed(feed.id)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-2 h-2 text-white" />}
                            </div>
                            <span className="text-xs font-medium text-slate-700 truncate">{feed.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Keywords per active category — always visible */}
        {activeCats.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Keywords</h3>
              <span className="text-xs text-slate-400">Per category — click X to remove, + to add</span>
            </div>

            <div className="space-y-4">
              {activeCats.map((cat) => {
                const keywords = getKeywordsForCategory(cat)
                const meta = categoryMeta[cat] || { icon: Rss, color: 'blue', label: cat }
                const colors = colorClasses[meta.color] || colorClasses.blue
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${colors.icon}`}>{meta.label}</span>
                      <button
                        onClick={() => addKeyword(cat)}
                        className="inline-flex items-center px-2 py-0.5 border border-slate-200 rounded text-xs font-medium text-slate-500 bg-white hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        Add
                      </button>
                    </div>
                    {keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keywords.map((kw) => (
                          <span key={kw} className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-xs text-slate-600 hover:border-slate-300 group">
                            {kw}
                            <button
                              onClick={() => removeKeyword(cat, kw)}
                              className="ml-1 text-slate-300 group-hover:text-red-500 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No keywords. Articles won't be filtered by keywords for this category.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Connected Site — combined platform + integration + setup */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">Publish to your website</h3>
            {automation.site_name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Step 1: Your site */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</div>
                <span className="text-sm font-medium text-slate-800">Your site</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Site name</label>
                  <input
                    type="text"
                    placeholder="e.g. CompanionGuide.ai"
                    value={automation.site_name}
                    onChange={(e) => update('site_name', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">News listing page</label>
                  <input
                    type="url"
                    placeholder="https://companionguide.ai/news"
                    value={automation.site_url}
                    onChange={(e) => update('site_url', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">The page on your site where articles are listed</p>
                </div>
              </div>
            </div>

            {/* Step 2: Choose platform */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-medium text-slate-800">Choose your platform</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-7">
                {[
                  { key: 'netlify', label: 'Netlify', desc: 'Static sites & SSG', color: 'teal', letter: 'N' },
                  { key: 'wordpress', label: 'WordPress', desc: 'Blog & CMS', color: 'blue', letter: 'W' },
                  { key: 'replit', label: 'Replit', desc: 'Hosted web apps', color: 'orange', letter: 'R' },
                  { key: 'other', label: 'Other', desc: 'Any website', color: 'slate', letter: '?' },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setExpandedGuide(expandedGuide === p.key ? null : p.key)
                      if (p.key !== 'other') update('integration_type', 'script-tag')
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      expandedGuide === p.key
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      expandedGuide === p.key ? 'bg-indigo-100' : 'bg-slate-100'
                    }`}>
                      <span className={`text-sm font-bold ${expandedGuide === p.key ? 'text-indigo-600' : 'text-slate-400'}`}>{p.letter}</span>
                    </div>
                    <span className={`text-xs font-medium ${expandedGuide === p.key ? 'text-slate-900' : 'text-slate-600'}`}>{p.label}</span>
                    <span className="text-[10px] text-slate-400">{p.desc}</span>
                  </button>
                ))}
              </div>

              {/* Platform-specific guide with step-by-step */}
              {expandedGuide === 'netlify' && (
                <div className="ml-7 mt-3 p-4 bg-teal-50/50 rounded-lg border border-teal-100">
                  <p className="text-xs text-slate-600 mb-3">Best for SEO: articles are baked into your HTML at build time so Google can index them. Between builds, the embed script keeps content fresh for visitors. News Pal triggers <strong>1 rebuild per day</strong> (only when new articles are published).</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Add this code to your site</p>
                        <p className="mb-1.5">Paste this in your HTML where you want articles to appear:</p>
                        <div className="relative">
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{`<div id="newspal-articles"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}/embed/newspal-loader.js"
  data-automation-id="${id}"
  data-limit="20"></script>`}</code></pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`<div id="newspal-articles"></div>\n<script src="${window.location.origin}/embed/newspal-loader.js"\n  data-automation-id="${id}"\n  data-limit="20"></script>`)
                              showNotification({ type: 'success', title: 'Copied', message: 'Embed snippet copied to clipboard', duration: 2000 })
                            }}
                            className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-md text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <Copy className="w-3 h-3 mr-1" />Copy
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">This script loads articles instantly for visitors. For SEO, add the webhook below so articles are also in the static HTML.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Create a deploy webhook in Netlify</p>
                        <p className="mt-0.5">Open your Netlify dashboard → select your site → <strong>Site configuration</strong> → <strong>Build & deploy</strong> → <strong>Build hooks</strong> → click <strong>Add build hook</strong>. Name it "News Pal" and click Save. Copy the URL.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Paste your webhook URL here</p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://api.netlify.com/build_hooks/..."
                            value={automation.deploy_webhook_url}
                            onChange={(e) => update('deploy_webhook_url', e.target.value)}
                            className="flex-1 border border-teal-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                          <button
                            onClick={triggerDeploy}
                            disabled={!automation.deploy_webhook_url}
                            className="inline-flex items-center px-3 py-1.5 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-30 shrink-0"
                          >
                            Deploy now
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Rebuilds <strong>your Netlify site</strong> so articles are in the static HTML (important for SEO). Triggered automatically once per day after new articles are published. "Deploy now" triggers a manual rebuild. Costs 1 build credit per trigger.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">That's it! Save your settings and you're done.</span>
                    </div>
                  </div>
                </div>
              )}
              {expandedGuide === 'wordpress' && (
                <div className="ml-7 mt-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs text-slate-600 mb-3">No plugin needed — just paste a snippet and articles load automatically.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Create a page for your articles</p>
                        <p className="mt-0.5">In WordPress → <strong>Pages</strong> → <strong>Add New</strong>. Name it "News" or "Blog". Switch to the <strong>Code editor</strong> (or use a Custom HTML block).</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Paste this code into the page</p>
                        <div className="relative">
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{`<div id="newspal-articles"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}/embed/newspal-loader.js"
  data-automation-id="${id}"
  data-limit="20"></script>`}</code></pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`<div id="newspal-articles"></div>\n<script src="${window.location.origin}/embed/newspal-loader.js"\n  data-automation-id="${id}"\n  data-limit="20"></script>`)
                              showNotification({ type: 'success', title: 'Copied', message: 'Embed snippet copied to clipboard', duration: 2000 })
                            }}
                            className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-md text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <Copy className="w-3 h-3 mr-1" />Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Publish the page</p>
                        <p className="mt-0.5">Click Publish. Articles load automatically whenever someone visits the page.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">That's it! Save your settings and you're done.</span>
                    </div>
                  </div>
                </div>
              )}
              {expandedGuide === 'replit' && (
                <div className="ml-7 mt-3 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                  <p className="text-xs text-slate-600 mb-3">Articles are fetched fresh on every page load — no extra setup needed.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Open your Replit project</p>
                        <p className="mt-0.5">Open the HTML file where you want articles to appear (e.g. <code className="bg-orange-100 px-1 rounded">index.html</code> or a dedicated news page).</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Paste this code into your HTML</p>
                        <div className="relative">
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{`<div id="newspal-articles"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}/embed/newspal-loader.js"
  data-automation-id="${id}"
  data-limit="20"></script>`}</code></pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`<div id="newspal-articles"></div>\n<script src="${window.location.origin}/embed/newspal-loader.js"\n  data-automation-id="${id}"\n  data-limit="20"></script>`)
                              showNotification({ type: 'success', title: 'Copied', message: 'Embed snippet copied to clipboard', duration: 2000 })
                            }}
                            className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-md text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <Copy className="w-3 h-3 mr-1" />Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">That's it! Save your settings and you're done.</span>
                    </div>
                  </div>
                </div>
              )}
              {expandedGuide === 'other' && (
                <div className="ml-7 mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Works with any website that supports HTML.</p>
                  <div className="space-y-2.5">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Choose "Embed script" in step 3 below</p>
                        <p className="mt-0.5">This is the easiest option — just copy and paste a snippet into your HTML. No coding required.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Or use the API directly</p>
                        <p className="mt-0.5">Choose "Custom code" if you want full control. You'll get a fetch URL that returns JSON with all your articles.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Integration type — only for 'other' platform or advanced toggle */}
            {(expandedGuide === 'other' || showAdvancedIntegration) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</div>
                <span className="text-sm font-medium text-slate-800">How should articles appear?</span>
              </div>
              <div className="ml-7 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { value: 'script-tag', label: 'Embed script', desc: 'Paste a snippet — articles load automatically', best: 'Easiest, works everywhere' },
                    { value: 'build-time', label: 'Auto-build', desc: 'Articles baked into your site at deploy time', best: 'Best for SEO & fast loading' },
                    { value: 'fetch-api', label: 'Custom code', desc: 'You fetch and render articles yourself', best: 'Full control over design' },
                    { value: 'netlify-function', label: 'Server function', desc: 'Runs on Netlify/Vercel server-side', best: 'Keeps API key private' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update('integration_type', automation.integration_type === opt.value ? '' : opt.value)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        automation.integration_type === opt.value
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                        automation.integration_type === opt.value ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {automation.integration_type === opt.value && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">{opt.best}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Setup instructions for chosen integration */}
                {automation.integration_type === 'script-tag' && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-1">Paste this in your site's HTML where you want articles to appear:</p>
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto mt-2"><code>{`<div id="newspal-articles"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}/embed/newspal-loader.js"
  data-automation-id="${id}"
  data-limit="20"></script>`}</code></pre>
                  </div>
                )}

                {automation.integration_type === 'build-time' && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-1">Add these environment variables in your hosting dashboard:</p>
                    <p className="text-xs text-slate-500 mb-2">For Netlify: Site settings → Environment variables. For Vercel: Project settings → Environment variables.</p>
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto mt-2"><code>{`NEWSPAL_API_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}
NEWSPAL_AUTOMATION_ID=${id}
NEWSPAL_LIMIT=50`}</code></pre>
                  </div>
                )}

                {automation.integration_type === 'fetch-api' && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-1">Use this code in your site to fetch and display articles:</p>
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto mt-2"><code>{`const res = await fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://newspal.vercel.app'}/api/articles/public?automation_id=${id}&limit=20');
const { articles } = await res.json();
// articles[] = { title, description, content, html, category, source, sourceUrl, imageUrl, publishedAt }`}</code></pre>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Advanced options toggle — only shown when a known platform is selected */}
            {expandedGuide && expandedGuide !== 'other' && !showAdvancedIntegration && (
              <button
                onClick={() => setShowAdvancedIntegration(true)}
                className="ml-7 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Advanced integration options
              </button>
            )}

            {/* Extra options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">{expandedGuide === 'other' || showAdvancedIntegration ? '4' : '3'}</div>
                <span className="text-sm font-medium text-slate-800">Extra options</span>
                <span className="text-xs text-slate-400">optional</span>
              </div>
              <div className="ml-7 space-y-4">
                {/* Deploy webhook — only show here if NOT already in Netlify guide */}
                {expandedGuide !== 'netlify' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Deploy webhook URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://api.netlify.com/build_hooks/..."
                        value={automation.deploy_webhook_url}
                        onChange={(e) => update('deploy_webhook_url', e.target.value)}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={triggerDeploy}
                        disabled={!automation.deploy_webhook_url}
                        className="inline-flex items-center px-3 py-1.5 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-30 shrink-0"
                      >
                        Deploy now
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Triggers a rebuild of <strong>your website</strong> (not News Pal). Happens automatically when new articles are published. Use "Deploy now" to manually rebuild your site.</p>
                  </div>
                )}

                {/* Match your site's design */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Match your site's design</label>
                  <p className="text-xs text-slate-500 mb-2">Paste a URL to an existing article on your site. AI will visit the page, analyze the HTML structure and CSS classes, and create a template so new articles look exactly like your existing ones — same fonts, colors, layout, and spacing.</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://yoursite.com/news/example-article"
                      value={automation.site_example_url}
                      onChange={(e) => update('site_example_url', e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={analyzeTemplate}
                      disabled={analyzing || !automation.site_example_url}
                      className="inline-flex items-center px-3 py-1.5 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {analyzing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing...</> : <><Search className="w-3 h-3 mr-1" />Analyze</>}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Without this, articles use a clean default design. With this, they blend seamlessly into your site.</p>
                  {(automation.site_template || automation.site_detail_template) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                      <Check className="w-3.5 h-3.5" />
                      <span>Template extracted — new articles will match your site's styling</span>
                    </div>
                  )}
                </div>

                {/* API URL + Test */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Diagnostics</label>
                  <p className="text-xs text-slate-500 mb-2">This is the API URL that your site uses to fetch articles. The embed script uses this automatically — you only need it if you're building a custom integration. Use "Test" to verify that News Pal can find your automation and articles.</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 shrink-0">Your API:</span>
                    <code className="flex-1 text-xs text-slate-700 font-mono truncate">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/api/articles/public?automation_id={id}
                    </code>
                    <button
                      onClick={copyApiUrl}
                      className="inline-flex items-center px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-600 bg-white hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-colors shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="inline-flex items-center px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-600 bg-white hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {testingConnection ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing...</> : 'Test'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Save your category, feed, and keyword changes.</p>
            <button
              onClick={() => save()}
              disabled={saving}
              className="inline-flex items-center px-5 py-2 bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 border border-indigo-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
