'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNotifications } from '../../../../components/NotificationSystem'
import { ArrowLeft, Check, Trash2, Copy, Plus, X, Rss, Shield, Building2, Bot, GraduationCap, Megaphone, Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Automation {
  id: string
  name: string
  enabled: boolean
  articles_per_day: number
  categories: string
  style: string
  length: string
  language: string
  keywords: string
  feeds: string
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
        setAutomation({ ...data, keywords: data.keywords || '', feeds: data.feeds || '' })
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Articles / day</label>
              <input
                type="number" min="1" max="10"
                value={automation.articles_per_day}
                onChange={(e) => update('articles_per_day', parseInt(e.target.value) || 2)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
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
            <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
            <span className="text-xs text-slate-400">{activeCats.length} active</span>
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

        {/* Publishing Guide */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Publish to your website</h3>
          <p className="text-xs text-slate-400 mb-4">
            {automation.enabled
              ? `This automation is active. Every day at 07:00 it fetches, rewrites, and publishes ${automation.articles_per_day} article${automation.articles_per_day > 1 ? 's' : ''}. Choose how you want to display them:`
              : 'Enable this automation (toggle above), save your settings, then follow the steps for your platform:'}
          </p>

          {/* API URL */}
          <div className="flex items-center gap-2 mb-5 p-3 bg-slate-50 rounded-lg border border-slate-100">
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
          </div>

          {/* Platform guides */}
          <div className="space-y-2">
            {/* Netlify */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGuide(expandedGuide === 'netlify' ? null : 'netlify')}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-teal-600">N</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900">Netlify</span>
                    <span className="text-xs text-slate-400 ml-2">Static site, Next.js, Gatsby, Hugo</span>
                  </div>
                </div>
                {expandedGuide === 'netlify' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expandedGuide === 'netlify' && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Add a news page to your Netlify site</p>
                        <p className="text-xs text-slate-500 mt-0.5">Create a page (e.g. <code className="bg-slate-100 px-1 rounded">/news</code> or <code className="bg-slate-100 px-1 rounded">/blog</code>) that fetches articles from your API.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Fetch articles with JavaScript</p>
                        <p className="text-xs text-slate-500 mt-0.5">Add this code to your page:</p>
                        <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{`// Fetch articles from News Pal
const API_URL = '${typeof window !== 'undefined' ? window.location.origin : 'https://your-newspal.vercel.app'}/api/articles/public?automation_id=${id}&limit=10';

async function loadArticles() {
  const res = await fetch(API_URL);
  const data = await res.json();
  return data.articles; // Array of articles
}

// Each article contains:
// - title        (rewritten headline)
// - content_html (full article in HTML)
// - imageUrl     (article image)
// - publishedAt  (ISO date)
// - category     (e.g. "europeanpurpose")`}</code></pre>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Render the articles</p>
                        <p className="text-xs text-slate-500 mt-0.5">Loop through articles and insert the <code className="bg-slate-100 px-1 rounded">content_html</code> into your page. Style with your own CSS.</p>
                        <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{`// Example: render articles on page
const articles = await loadArticles();
const container = document.getElementById('news');

articles.forEach(article => {
  container.innerHTML += \`
    <article>
      <h2>\${article.title}</h2>
      <time>\${new Date(article.publishedAt).toLocaleDateString('nl-NL')}</time>
      \${article.imageUrl ? \`<img src="\${article.imageUrl}" alt="">\` : ''}
      <div>\${article.content_html}</div>
    </article>
  \`;
});`}</code></pre>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Deploy</p>
                        <p className="text-xs text-slate-500 mt-0.5">Push to your repo. Netlify rebuilds automatically. Articles update every time the page loads (client-side fetch) or on rebuild (SSG).</p>
                      </div>
                    </div>
                    <div className="mt-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <p className="text-xs text-teal-700"><strong>Note:</strong> News Pal must be deployed online (e.g. Vercel) for Netlify to reach the API. While developing locally, use <code className="bg-teal-100 px-1 rounded">localhost:3000</code> for testing.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WordPress */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGuide(expandedGuide === 'wordpress' ? null : 'wordpress')}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">W</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900">WordPress</span>
                    <span className="text-xs text-slate-400 ml-2">Auto-publish via REST API</span>
                  </div>
                </div>
                {expandedGuide === 'wordpress' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expandedGuide === 'wordpress' && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Create an Application Password in WordPress</p>
                        <p className="text-xs text-slate-500 mt-0.5">Go to WordPress &rarr; Users &rarr; Profile &rarr; Application Passwords. Create one and save the password.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Add WordPress credentials to News Pal</p>
                        <p className="text-xs text-slate-500 mt-0.5">Add to your <code className="bg-slate-100 px-1 rounded">.env.local</code>: <code className="bg-slate-100 px-1 rounded">WORDPRESS_SITE_URL</code>, <code className="bg-slate-100 px-1 rounded">WORDPRESS_USERNAME</code>, <code className="bg-slate-100 px-1 rounded">WORDPRESS_APP_PASSWORD</code></p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Articles are auto-published</p>
                        <p className="text-xs text-slate-500 mt-0.5">The pipeline pushes rewritten articles directly to WordPress as draft or published posts via the REST API.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Replit */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGuide(expandedGuide === 'replit' ? null : 'replit')}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-600">R</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900">Replit</span>
                    <span className="text-xs text-slate-400 ml-2">Hosted web app</span>
                  </div>
                </div>
                {expandedGuide === 'replit' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expandedGuide === 'replit' && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Add a fetch to your Replit app</p>
                        <p className="text-xs text-slate-500 mt-0.5">Use <code className="bg-slate-100 px-1 rounded">fetch()</code> to pull articles from the API URL above. Same code as the Netlify example.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Render articles in your HTML</p>
                        <p className="text-xs text-slate-500 mt-0.5">Each article has <code className="bg-slate-100 px-1 rounded">title</code>, <code className="bg-slate-100 px-1 rounded">content_html</code>, <code className="bg-slate-100 px-1 rounded">imageUrl</code>, and <code className="bg-slate-100 px-1 rounded">publishedAt</code>. Insert into your page template.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Articles refresh automatically</p>
                        <p className="text-xs text-slate-500 mt-0.5">Since Replit apps are always running, every page load fetches the latest articles from News Pal.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* HubSpot */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGuide(expandedGuide === 'hubspot' ? null : 'hubspot')}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-500">H</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900">HubSpot</span>
                    <span className="text-xs text-slate-400 ml-2">CMS blog module</span>
                  </div>
                </div>
                {expandedGuide === 'hubspot' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expandedGuide === 'hubspot' && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Create a custom module in HubSpot CMS</p>
                        <p className="text-xs text-slate-500 mt-0.5">Go to Design Manager &rarr; Create module. Add a HubL + JavaScript module that fetches from your API.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Use serverless functions or client-side fetch</p>
                        <p className="text-xs text-slate-500 mt-0.5">HubSpot serverless functions can fetch the API server-side, or use client-side JavaScript on the page. Same <code className="bg-slate-100 px-1 rounded">fetch()</code> pattern.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Add the module to a page</p>
                        <p className="text-xs text-slate-500 mt-0.5">Drag the module onto any HubSpot page. Articles from News Pal will render automatically.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
