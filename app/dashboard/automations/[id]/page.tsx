'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNotifications } from '../../../../components/NotificationSystem'
import { ArrowLeft, Check, Trash2, Copy, Plus, X, Rss, Shield, Building2, Bot, GraduationCap, Megaphone, Globe, ExternalLink, Link, Search, Loader2, Code, ChevronDown, FileText, Calendar, Clock, ArrowRightLeft, PenLine, Activity, AlertTriangle } from 'lucide-react'

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
  site_platform: string
  site_api_key: string
  replit_url: string
}

interface Feed {
  id: string
  name: string
  url: string
  category: string
  enabled: boolean
}

interface Article {
  id: string
  title: string
  url: string
  category: string
  status: string
  publishedAt: string
  createdAt?: string
  source: string
  matchedKeywords?: string[]
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
  const [connectionHealth, setConnectionHealth] = useState<{ healthy: boolean; issues: string[]; checks: any } | null>(null)
  const [showAdvancedIntegration, setShowAdvancedIntegration] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [articleCounts, setArticleCounts] = useState({ total: 0, selected: 0, published: 0 })
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [activeArticleTab] = useState<'all'>('all')
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [pushingTest, setPushingTest] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) {
      loadAutomation()
      loadCategories()
      loadFeeds()
      loadArticles()
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
          site_platform: data.site_platform || '',
          site_api_key: data.site_api_key || '',
          replit_url: data.replit_url || '',
        })
        if (data.site_platform) {
          setExpandedGuide(data.site_platform)
        }
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

  const loadArticles = async () => {
    setArticlesLoading(true)
    try {
      const res = await fetch(`/api/articles/by-automation?automation_id=${id}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles)
        setArticleCounts(data.counts)
      }
    } catch (error) {
      console.error('Error loading articles:', error)
    } finally {
      setArticlesLoading(false)
    }
  }

  const handleDeleteArticle = async (article: Article) => {
    const confirmed = await showConfirm({
      title: 'Delete article',
      message: `Are you sure you want to delete "${article.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/articles/${article.id}`, { method: 'DELETE' })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Deleted', message: 'Article removed' })
        loadArticles()
      } else {
        showNotification({ type: 'error', title: 'Error', message: 'Could not delete article' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not delete article' })
    }
  }

  const handleUpdateArticleDate = async (articleId: string, newDate: string) => {
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newDate }),
      })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Updated', message: 'Date updated' })
        setEditingDateId(null)
        loadArticles()
      } else {
        showNotification({ type: 'error', title: 'Error', message: 'Could not update date' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not update date' })
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Keywords helpers
  const getKeywordsMap = (): { [cat: string]: string[] } => {
    if (!automation?.keywords) return {}
    try { return JSON.parse(automation.keywords) } catch { return {} }
  }

  const getKeywordsEnabled = (): boolean => {
    const map = getKeywordsMap()
    return (map as any)._enabled !== false
  }

  const setKeywordsEnabled = async (enabled: boolean) => {
    const map = getKeywordsMap();
    (map as any)._enabled = enabled
    const newKeywords = JSON.stringify(map)
    update('keywords', newKeywords)
    await save({ keywords: newKeywords }, true)
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
    const currentLower = current.map(k => k.toLowerCase())
    const newKws = input.split(',').map(k => k.trim()).filter(k => k && !currentLower.includes(k.toLowerCase()))
    if (newKws.length > 0) {
      setKeywordsForCategory(cat, [...current, ...newKws])
      showNotification({ type: 'success', title: `${newKws.length} keyword(s) added`, message: newKws.join(', '), duration: 3000 })
    } else {
      showNotification({ type: 'warning', title: 'No new keywords', message: 'All keywords already exist', duration: 3000 })
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

  const save = async (overrides?: Partial<Automation>, silent = false) => {
    if (!automation) return
    setSaving(true)
    try {
      const merged = overrides ? { ...automation, ...overrides } : automation
      if (!merged.articles_per_day || merged.articles_per_day < 1) merged.articles_per_day = 1
      // Auto-fill site_name from automation name
      if (merged.site_url && !merged.site_name) merged.site_name = merged.name
      const { id: _id, ...fields } = merged
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (res.ok) {
        if (!silent) {
          showNotification({ type: 'success', title: 'Saved', message: 'Automation settings saved', duration: 3000 })
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
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
    setConnectionHealth(null)
    try {
      const res = await fetch('/api/sites/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation_id: id }),
      })
      const data = await res.json()
      if (data.success) {
        setConnectionHealth({ healthy: data.healthy, issues: data.issues, checks: data.checks })
        if (data.healthy) {
          showNotification({ type: 'success', title: 'All good', message: 'Automation is healthy and connected', duration: 3000 })
        } else {
          showNotification({ type: 'warning', title: `${data.issues.length} issue(s) found`, message: data.issues[0], duration: 5000 })
        }
      } else {
        showNotification({ type: 'error', title: 'Test failed', message: data.error || 'Could not test connection' })
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

  const generateApiKey = async () => {
    const key = 'npk_' + Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
    update('site_api_key', key)
    await save({ site_api_key: key }, true)
  }

  const testPush = async () => {
    const pushUrl = automation?.replit_url || automation?.site_url
    if (!pushUrl || !automation?.site_api_key) {
      showNotification({ type: 'error', title: 'Missing info', message: 'Enter your Replit app URL and generate an API key first' })
      return
    }
    setPushingTest(true)
    try {
      const res = await fetch('/api/sites/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_url: pushUrl,
          site_api_key: automation.site_api_key,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPushSuccess(true)
        showNotification({ type: 'success', title: 'Push successful', message: `Your Replit site received the test article`, duration: 4000 })
      } else {
        setPushSuccess(false)
        showNotification({ type: 'error', title: 'Push failed', message: data.error || 'Could not reach your Replit site' })
      }
    } catch {
      setPushSuccess(false)
      showNotification({ type: 'error', title: 'Error', message: 'Could not test push connection' })
    } finally {
      setPushingTest(false)
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
          {saving ? 'Saving...' : 'Save Settings'}
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
        {/* Articles overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Articles</h3>
              <span className="text-xs text-slate-400">{articleCounts.total} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRunningPipeline(true)
                  try {
                    const res = await fetch('/api/cron/auto-pipeline', { method: 'POST' })
                    const data = await res.json()
                    const result = data.automations?.find((a: any) => a.automation_id === id)
                    if (result?.rewritten > 0) {
                      showNotification({ type: 'success', title: 'Pipeline complete', message: `${result.rewritten} article(s) scheduled`, duration: 4000 })
                    } else {
                      showNotification({ type: 'warning', title: 'Pipeline complete', message: result?.message || 'No new articles found', duration: 4000 })
                    }
                    loadArticles()
                  } catch {
                    showNotification({ type: 'error', title: 'Error', message: 'Pipeline failed' })
                  } finally {
                    setRunningPipeline(false)
                  }
                }}
                disabled={runningPipeline || !automation.enabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <Loader2 className={`w-3 h-3 ${runningPipeline ? 'animate-spin' : ''}`} />
                {runningPipeline ? 'Fetching & rewriting articles — this takes about 1 min...' : 'Fetch articles'}
              </button>
              <button
                onClick={() => loadArticles()}
                disabled={articlesLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50"
              >
                <Loader2 className={`w-3 h-3 ${articlesLoading ? 'animate-spin' : ''}`} />
                {articlesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Pipeline running indicator */}
          {runningPipeline && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-900">Fetching and rewriting articles...</p>
                <p className="text-xs text-indigo-600 mt-0.5">AI is selecting, filtering, and rewriting articles in your style. This usually takes about 1 minute.</p>
              </div>
            </div>
          )}

          {/* Summary strip */}
          <div className="flex items-center justify-between gap-4 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last processed: {(() => {
                  const sorted = [...articles].filter(a => a.createdAt).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                  return sorted.length > 0 ? formatRelativeTime(sorted[0].createdAt!) : 'never'
                })()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Next run: daily at 7:00
              </span>
              {connectionHealth && (
                <span className={`flex items-center gap-1 font-medium ${connectionHealth.healthy ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {connectionHealth.healthy
                    ? <><Check className="w-3.5 h-3.5" />Healthy</>
                    : <><AlertTriangle className="w-3.5 h-3.5" />{connectionHealth.issues.length} issue{connectionHealth.issues.length !== 1 ? 's' : ''}</>
                  }
                </span>
              )}
            </div>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {testingConnection
                ? <><Loader2 className="w-3 h-3 animate-spin" />Testing...</>
                : <><Activity className="w-3 h-3" />Test connection</>
              }
            </button>
          </div>

          {/* Connection issues */}
          {connectionHealth && !connectionHealth.healthy && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-800 mb-1.5">Issues found:</p>
              <ul className="space-y-1">
                {connectionHealth.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article list */}
          {articlesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading articles...
            </div>
          ) : articles.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              No articles yet. The automation will process articles on the next scheduled run (daily at 7:00).
            </div>
          ) : (() => {
            const isRefusal = (title: string) =>
              /I('m| am) sorry|I('m| am) unable to|I can'?t (perform|assist|help)|Unfortunately,? I cannot/i.test(title)
            const filtered = articles
              .filter(a => !isRefusal(a.title))
            const scheduled = filtered.filter(a => a.status === 'selected')
              .sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime())
            const published = filtered.filter(a => a.status === 'published')
              .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            const planningSlots = scheduled.slice(0, 3)
            const slotDates = planningSlots.map((_, i) => {
              const d = new Date()
              d.setDate(d.getDate() + i)
              return d
            })
            const planningIds = new Set(planningSlots.map(a => a.id))
            const publishedIds = new Set(published.map(a => a.id))
            const rest = filtered.filter(a => !planningIds.has(a.id) && !publishedIds.has(a.id))

            const renderArticleRow = (article: Article, isSlot: boolean, slotDate?: Date) => {
              const meta = categoryMeta[article.category]
              const colors = meta ? colorClasses[meta.color] : null
              return (
                <div
                  key={article.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg group transition-colors ${
                    isSlot
                      ? 'bg-indigo-50/50 border border-indigo-200/60 hover:bg-indigo-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {isSlot && (
                    <div className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Calendar className="w-3 h-3" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block transition-colors"
                    >
                      {article.title}
                    </a>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">{article.source}</span>
                      {article.publishedAt && (
                        <span className="text-[11px] text-slate-300">
                          {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {article.matchedKeywords && article.matchedKeywords.length > 0 &&
                        [...new Set(article.matchedKeywords.map(kw => kw.replace(/,\s*$/, '').trim()).filter(Boolean))].map(kw => (
                          <span key={kw} className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-slate-100 text-slate-500">
                            {kw}
                          </span>
                        ))}
                    </div>
                  </div>
                  {meta && colors && (
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.badge}`}>
                      {meta.label}
                    </span>
                  )}
                  {editingDateId === article.id ? (
                    <input
                      type="date"
                      defaultValue={article.publishedAt ? article.publishedAt.split('T')[0] : ''}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleUpdateArticleDate(article.id, e.target.value + 'T07:00:00.000Z')
                        } else {
                          setEditingDateId(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingDateId(null)
                      }}
                      autoFocus
                      className="shrink-0 text-xs border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <span
                      className={`shrink-0 text-xs ${article.status === 'selected' ? 'text-indigo-600 font-medium cursor-pointer hover:text-indigo-700' : 'text-slate-400'}`}
                      onClick={() => article.status === 'selected' && setEditingDateId(article.id)}
                      title={article.status === 'selected' ? 'Click to change date' : undefined}
                    >
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                        : '—'}
                    </span>
                  )}
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    article.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : article.status === 'selected'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {article.status === 'published' ? 'Published' : article.status === 'selected' ? 'Scheduled' : article.status}
                  </span>
                  {article.status === 'published' && automation.site_url && (
                    <a
                      href={automation.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="View on site"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View on site
                    </a>
                  )}
                  <div className="shrink-0 flex items-center gap-0.5">
                    {(article.status === 'selected' || article.status === 'published' || article.status === 'rewritten') && (
                      <a
                        href={`/dashboard/rewrite/${article.id}`}
                        className="p-1 rounded text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                        title="View / edit article"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!isSlot && article.status !== 'published' && article.status !== 'selected' && (
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`/api/articles/${article.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'selected' }),
                            })
                            showNotification({ type: 'success', title: 'Scheduled', message: `"${article.title}" added to planning` })
                            loadArticles()
                          } catch {
                            showNotification({ type: 'error', title: 'Error', message: 'Could not schedule article' })
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        title="Schedule this article"
                      >
                        <Calendar className="w-3 h-3" />
                        Schedule
                      </button>
                    )}
                    {article.status === 'selected' && (
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`/api/articles/${article.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'published' }),
                            })
                            showNotification({ type: 'success', title: 'Published', message: `"${article.title}" is now published` })
                            loadArticles()
                          } catch {
                            showNotification({ type: 'error', title: 'Error', message: 'Could not publish article' })
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        title="Publish now"
                      >
                        Publish now
                      </button>
                    )}
                    {!isSlot && article.status !== 'published' && planningSlots.some(s => s.status === 'selected') && (
                      <button
                        onClick={async () => {
                          const lastSlot = [...planningSlots].reverse().find(s => s.status === 'selected')
                          if (!lastSlot) return
                          try {
                            await Promise.all([
                              fetch(`/api/articles/${article.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'selected' }),
                              }),
                              fetch(`/api/articles/${lastSlot.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'pending' }),
                              }),
                            ])
                            showNotification({ type: 'success', title: 'Swapped', message: `"${article.title}" replaced "${lastSlot.title}"` })
                            loadArticles()
                          } catch {
                            showNotification({ type: 'error', title: 'Error', message: 'Could not swap articles' })
                          }
                        }}
                        className="p-1 rounded text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Swap with last scheduled article"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(article.status === 'selected' || article.status === 'published') && (
                      <button
                        onClick={() => handleDeleteArticle(article)}
                        className="p-1 rounded text-slate-700 hover:text-red-500 hover:bg-red-50"
                        title="Delete article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div className="space-y-1">
                {planningSlots.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1.5 px-1">
                      Up next
                    </p>
                    {planningSlots.map((a, i) => renderArticleRow(a, true, slotDates[i]))}
                  </>
                )}
                {published.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide mt-4 mb-1.5 px-1">
                      Published
                    </p>
                    {published.map(a => renderArticleRow(a, false))}
                  </>
                )}
                {rest.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-1.5 px-1">
                      Alternatives
                    </p>
                    {rest.map(a => renderArticleRow(a, false))}
                  </>
                )}
              </div>
            )
          })()}
        </div>

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
                value={automation.articles_per_day || ''}
                onChange={(e) => update('articles_per_day', e.target.value === '' ? 0 : parseInt(e.target.value))}
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
                <option value="short">Short (200-300 words)</option>
                <option value="medium">Medium (400-600 words)</option>
                <option value="long">Long (700-1000 words)</option>
                <option value="extra-long">Extra Long (1200-1500 words)</option>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Keywords</h3>
                <span className="text-xs text-slate-400">Per category — click X to remove, + to add</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-500">{getKeywordsEnabled() ? 'Filter on' : 'Filter off'}</span>
                <button
                  onClick={() => setKeywordsEnabled(!getKeywordsEnabled())}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${getKeywordsEnabled() ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${getKeywordsEnabled() ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </label>
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
                        className="inline-flex items-center px-2 py-0.5 border border-slate-200 rounded text-xs font-medium text-slate-500 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
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
            {automation.site_platform && automation.site_url && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {automation.site_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Step 1: Your site */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {automation.site_url ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                )}
                <span className="text-sm font-medium text-slate-800">Your site</span>
              </div>
              <div className="ml-7">
                <label className="block text-xs font-medium text-slate-400 mb-1">News page URL</label>
                <input
                  type="url"
                  placeholder="https://mywebsite.com/news"
                  value={automation.site_url}
                  onChange={(e) => {
                    update('site_url', e.target.value)
                    if (!automation.site_name) update('site_name', automation.name)
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">The page on your website where news articles will appear</p>
              </div>
            </div>

            {/* Step 2: Choose platform */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {automation.site_platform && (
                  (automation.site_platform === 'netlify' && automation.deploy_webhook_url) ||
                  (automation.site_platform === 'replit' && automation.site_api_key) ||
                  automation.site_platform === 'wordpress' ||
                  automation.site_platform === 'other'
                ) ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                )}
                <span className="text-sm font-medium text-slate-800">Choose your platform</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-7">
                {[
                  { key: 'netlify', label: 'Netlify', desc: 'Static sites & SSG', logo: '/images/platforms/netlify.png' },
                  { key: 'wordpress', label: 'WordPress', desc: 'Blog & CMS', logo: '/images/platforms/wordpress.png' },
                  { key: 'replit', label: 'Replit', desc: 'Hosted web apps', logo: '/images/platforms/replit.png' },
                  { key: 'other', label: 'Other', desc: 'Any website', logo: null },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setExpandedGuide(expandedGuide === p.key ? null : p.key)
                      update('site_platform', p.key)
                      if (p.key === 'replit') {
                        update('integration_type', 'fetch-api')
                      } else if (p.key !== 'other') {
                        update('integration_type', 'script-tag')
                      }
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      expandedGuide === p.key
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                      {p.logo ? (
                        <img src={p.logo} alt={p.label} className="w-7 h-7 object-contain" />
                      ) : (
                        <span className={`text-sm font-bold ${expandedGuide === p.key ? 'text-indigo-600' : 'text-slate-400'}`}>?</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${expandedGuide === p.key ? 'text-slate-900' : 'text-slate-600'}`}>{p.label}</span>
                    <span className="text-[10px] text-slate-400">{p.desc}</span>
                  </button>
                ))}
              </div>

              {/* Platform-specific guide with step-by-step */}
              {expandedGuide === 'netlify' && (
                <div className="ml-7 mt-3 p-4 bg-teal-50/50 rounded-lg border border-teal-100">
                  <p className="text-xs text-slate-600 mb-3">Articles load automatically on your site via a small script. News Pal triggers <strong>1 rebuild per day</strong> so Google can index new articles too.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Copy this prompt and paste it in your code editor AI</p>
                        <p className="mb-1.5">Works with Claude Code, Cursor, Replit AI, or any AI assistant with access to your project.</p>
                        {(() => {
                          const apiBase = 'https://newspal.netlify.app'
                          const netlifyPrompt = `Integrate News Pal articles into my existing site (${automation.site_url || 'my website'}). My site already has a news/blog page and article detail pages. The articles from News Pal should appear in my existing design as if they are native content — same cards, same layout, same styling.

## API Endpoint
GET ${apiBase}/api/articles/public?automation_id=${id}&limit=20

Returns JSON:
{
  "success": true,
  "articles": [
    {
      "id": "recXXX",
      "title": "Article title",
      "description": "Short summary",
      "content_html": "<section class=\\"content-section\\" id=\\"slug\\"><h2>Heading</h2><p>Paragraph</p></section>",
      "category": "Category Name",
      "source": "Source Name",
      "sourceUrl": "https://original-url.com",
      "imageUrl": "https://...",
      "subtitle": "One-line subtitle under the title",
      "publishedAt": "2026-03-11T07:00:00.000Z",
      "faq": "[{\\"question\\":\\"Question?\\",\\"answer\\":\\"Answer text\\"}]"
    }
  ]
}

## What to do
- Fetch articles from the API above at BUILD TIME and merge them into the existing news/article overview page — same grid, same card design, same styling as articles already on the site
- For each article, create a detail page using my site's existing article/detail page template and layout
- On the detail page: render content_html directly (it's pre-formatted HTML with <section>, <h2>, <p>, <ul> tags). Style these tags to match my site's typography.
- If faq exists (JSON string of [{question, answer}]), render as a collapsible FAQ section on the detail page
- Generate slugs from title: lowercase, replace non-alphanumeric with hyphens, max 80 chars
- Add og:title, og:description, og:image meta tags on detail pages for SEO
- Nothing new needs to be designed — use my existing pages and components, just add the API data source

## Deploy hook (important!)
Set up a Netlify Build Hook so the site rebuilds daily with fresh articles:
1. Netlify dashboard → Site configuration → Build & deploy → Build hooks
2. Add build hook → Name: "News Pal" → Copy the URL
3. Give me the webhook URL — I need to paste it into News Pal so it triggers a rebuild when new articles are published`
                          return <>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(netlifyPrompt)
                                showNotification({ type: 'success', title: 'Copied', message: 'Prompt copied — paste it in your AI code editor', duration: 3000 })
                              }}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 transition-colors"
                            >
                              <Copy className="w-3 h-3 mr-1.5" />Copy prompt
                            </button>
                            <details className="mt-2">
                              <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">View prompt</summary>
                              <div className="mt-1.5">
                                <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{netlifyPrompt}</pre>
                              </div>
                            </details>
                          </>
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {automation.deploy_webhook_url ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Paste your Netlify Build Hook URL here</p>
                        <p className="mb-1.5">Your AI assistant will tell you how to create this. Paste the URL below so News Pal can trigger a rebuild when new articles are ready.</p>
                        <input
                          type="url"
                          placeholder="https://api.netlify.com/build_hooks/..."
                          value={automation.deploy_webhook_url}
                          onChange={(e) => update('deploy_webhook_url', e.target.value)}
                          className="w-full border border-teal-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">Done! Save settings and articles will appear automatically.</span>
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
                            className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-md text-[10px] text-slate-400 bg-slate-800/90 hover:bg-slate-700 transition-colors"
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
                  <p className="text-xs text-slate-600 mb-3">News Pal <strong>pushes articles directly</strong> to your Replit site — fully automatic. New articles appear on your site without any manual work.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      {automation.site_api_key ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Generate your API key</p>
                        <p className="mb-2">This key secures the connection between News Pal and your Replit site.</p>
                        <div className="flex items-center gap-2">
                          {automation.site_api_key ? (
                            <>
                              <code className="flex-1 text-xs bg-slate-900 text-emerald-400 rounded-lg px-3 py-1.5 font-mono truncate">{automation.site_api_key}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(automation.site_api_key)
                                  showNotification({ type: 'success', title: 'Copied', message: 'API key copied', duration: 2000 })
                                }}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
                              >
                                <Copy className="w-3 h-3 mr-1" />Copy
                              </button>
                              <button
                                onClick={generateApiKey}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors shrink-0"
                              >
                                Regenerate
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={generateApiKey}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                            >
                              Generate API key
                            </button>
                          )}
                        </div>
                        {automation.site_api_key && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>API key saved — ready to use</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {automation.replit_url ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Enter your Replit app URL</p>
                        <p className="mb-2">The URL of your running Replit project — find it in the Replit webview.</p>
                        <input
                          type="url"
                          value={automation.replit_url || ''}
                          onChange={e => update('replit_url', e.target.value)}
                          onBlur={() => save({ replit_url: automation.replit_url }, true)}
                          placeholder="https://your-project.username.repl.co"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-300"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Copy this prompt and paste it in Replit AI</p>
                        <p className="mb-1.5">Open your Replit project, open the AI chat, and paste this prompt. It will set everything up for you.</p>
                        {(() => {
                            const prompt = `Add a News Pal integration to my project. This receives articles via a POST endpoint and serves them as pages on my site, matching my site's existing design.

## How it works
News Pal pushes articles to your site daily via POST. Your site stores them and serves them as pages.

## Requirements
- Create a file called newspal.js that exports a function taking an Express app
- POST /newspal/receive — accepts { articles: [...] } with header x-newspal-key validated against process.env.NEWSPAL_API_KEY. Store articles in a JSON file (newspal-articles.json). Deduplicate by slug. Return { success, received, total }.
- GET /news — renders an article listing page with cards (image, category badge, title linking to /news/:slug, description, date). Style it to match the existing site design.
- GET /news/:slug — renders a full article detail page with title, subtitle, meta info, image, HTML content, and FAQ section (collapsible). Style it to match the existing site.
- In my main server file, add: app.use(express.json()); require('./newspal')(app);
- Add NEWSPAL_API_KEY to my Replit Secrets with value: ${automation.site_api_key || '(generate key in News Pal first)'}

## Article data format
Each article object has these fields:
{
  "slug": "article-title-here",
  "title": "Article title",
  "description": "Short summary",
  "content_html": "<section class=\\"content-section\\">...</section>",
  "category": "${categoryMeta[automation.categories]?.label || automation.categories || 'your-category'}",
  "source": "Original Source",
  "sourceUrl": "https://original-url.com",
  "imageUrl": "https://...",
  "subtitle": "One-line subtitle",
  "publishedAt": "2026-03-11T07:00:00.000Z",
  "faq": "[{\\"question\\":\\"..\\",\\"answer\\":\\"..\\"}]"
}

## Important
- The content_html is already formatted with <section>, <h2>, <p>, <ul> tags — render it directly
- If faq exists, parse the JSON string and render as collapsible Q&A items
- All pages must match my existing site's design (fonts, colors, layout, spacing)
- Do NOT add CSRF protection, referrer checks, or origin validation to /newspal/receive — it uses x-newspal-key for authentication instead
- Do NOT use helmet() or any middleware that validates Referer/Origin headers on this route`
                            return <>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt)
                                  showNotification({ type: 'success', title: 'Copied', message: 'Prompt copied — paste it in Replit AI', duration: 3000 })
                                }}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                              >
                                <Copy className="w-3 h-3 mr-1.5" />Copy prompt
                              </button>
                              <details className="mt-2">
                                <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">View prompt</summary>
                                <div className="mt-1.5 relative">
                                  <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 pr-16 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{prompt}</pre>
                                </div>
                              </details>
                            </>
                          })()}
                        <details className="mt-2">
                          <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">View the code manually</summary>
                          <div className="mt-2 relative">
                            <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto"><code id="replit-snippet-code">{`// newspal.js — News Pal auto-publish receiver
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'newspal-articles.json');

function loadArticles() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

module.exports = function(app) {
  app.post('/newspal/receive', (req, res) => {
    const key = req.headers['x-newspal-key'];
    if (key !== process.env.NEWSPAL_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const existing = loadArticles();
    const existingSlugs = new Set(existing.map(a => a.slug));
    const newArticles = (req.body.articles || [])
      .filter(a => !existingSlugs.has(a.slug));
    const merged = [...newArticles, ...existing];
    fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
    res.json({ success: true, received: newArticles.length, total: merged.length });
  });

  app.get('/news', (req, res) => {
    const articles = loadArticles();
    const cards = articles.map(a => \`
      <article style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1.5rem;">
        \${a.imageUrl ? \`<img src="\${a.imageUrl}" style="width:100%;height:200px;object-fit:cover;">\` : ''}
        <div style="padding:1.25rem;">
          <span style="font-size:11px;color:#6366f1;font-weight:600;text-transform:uppercase;">\${a.category}</span>
          <h2 style="margin:0.5rem 0;font-size:1.15rem;"><a href="/news/\${a.slug}" style="color:#1e293b;text-decoration:none;">\${a.title}</a></h2>
          <p style="color:#64748b;font-size:0.875rem;">\${a.description}</p>
          <time style="font-size:12px;color:#94a3b8;">\${new Date(a.publishedAt).toLocaleDateString()}</time>
        </div>
      </article>\`).join('');
    res.send(\`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>News</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f8fafc;padding:2rem}.container{max-width:720px;margin:0 auto}</style></head>
      <body><div class="container"><h1 style="margin-bottom:2rem">Latest News</h1>\${cards}</div></body></html>\`);
  });

  app.get('/news/:slug', (req, res) => {
    const a = loadArticles().find(a => a.slug === req.params.slug);
    if (!a) return res.status(404).send('Not found');
    const faqHtml = a.faq ? JSON.parse(a.faq).map(f =>
      \`<details style="margin-bottom:.75rem"><summary style="cursor:pointer;font-weight:600">\${f.q}</summary><p style="padding:.5rem 0;color:#64748b">\${f.a}</p></details>\`
    ).join('') : '';
    res.send(\`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\${a.title}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f8fafc;padding:2rem}.container{max-width:720px;margin:0 auto}.content{line-height:1.8}</style></head>
      <body><div class="container"><a href="/news" style="color:#6366f1;font-size:13px">&larr; Back</a>
      <h1 style="margin-top:1rem;font-size:1.75rem">\${a.title}</h1>
      \${a.subtitle ? \`<p style="font-size:1.1rem;color:#64748b;margin:1rem 0">\${a.subtitle}</p>\` : ''}
      <div style="font-size:13px;color:#94a3b8;margin-bottom:1.5rem">\${a.category} &middot; \${new Date(a.publishedAt).toLocaleDateString()} &middot; \${a.source}</div>
      \${a.imageUrl ? \`<img src="\${a.imageUrl}" style="width:100%;border-radius:12px;margin-bottom:1.5rem">\` : ''}
      <div class="content">\${a.content_html || a.description}</div>
      \${faqHtml ? \`<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0"><h2 style="font-size:1.25rem;margin-bottom:1rem">FAQ</h2>\${faqHtml}</div>\` : ''}
      </div></body></html>\`);
  });
};`}</code></pre>
                            <button
                              onClick={() => {
                                const snippetEl = document.getElementById('replit-snippet-code')
                                navigator.clipboard.writeText(snippetEl?.textContent || '')
                                showNotification({ type: 'success', title: 'Copied', message: 'Code copied', duration: 2000 })
                              }}
                              className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-md text-[10px] text-slate-400 bg-slate-800/90 hover:bg-slate-700 transition-colors"
                            >
                              <Copy className="w-3 h-3 mr-1" />Copy
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {automation.site_template || automation.site_detail_template ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">4</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Match your site's design</p>
                        <p className="mb-2">Paste a link to an existing page on your site, then click <strong>Analyze</strong>. AI scans the HTML so new articles match your site's fonts, colors, and layout.</p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://yoursite.com/news/example-article"
                            value={automation.site_example_url}
                            onChange={(e) => update('site_example_url', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-300"
                          />
                          <button
                            onClick={analyzeTemplate}
                            disabled={analyzing || !automation.site_example_url}
                            className={analyzing || (!automation.site_template && !automation.site_detail_template) ? 'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40 shrink-0' : 'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40 shrink-0'}
                          >
                            {analyzing
                              ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Analyzing...</>
                              : automation.site_template || automation.site_detail_template
                                ? <><Check className="w-3 h-3 mr-1.5" />Re-analyze</>
                                : <><Search className="w-3 h-3 mr-1.5" />Analyze</>
                            }
                          </button>
                        </div>
                        {(automation.site_template || automation.site_detail_template) && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Template extracted — new articles will match your site's styling</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">5</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Test the connection</p>
                        <p className="mb-2">Make sure your Replit site is running, then click the button to send a test article.</p>
                        <button
                          onClick={testPush}
                          disabled={pushingTest || (!automation.replit_url && !automation.site_url) || !automation.site_api_key}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40"
                        >
                          {pushingTest ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending test article...</> : 'Send test article'}
                        </button>
                      </div>
                    </div>
                    {pushSuccess && (
                      <div className="flex items-center gap-2 mt-1 ml-7">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-700">Done! Save settings and articles will be pushed automatically.</span>
                      </div>
                    )}
                    <div className="ml-7 mt-1 p-2.5 bg-orange-100/50 rounded-lg">
                      <p className="text-[11px] text-orange-700">Articles will appear at <strong>{automation.site_url ? new URL(automation.site_url).origin : 'your-site'}/news</strong> after the next pipeline run. Individual articles at <strong>/news/article-slug</strong>.</p>
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

            {/* Step 3: Match your site's design */}
            {expandedGuide !== 'replit' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {automation.site_template || automation.site_detail_template ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                )}
                <span className="text-sm font-medium text-slate-800">Match your site's design</span>
              </div>
              <div className="ml-7 space-y-2">
                <p className="text-xs text-slate-500">Paste a link to an existing article or page on your site, then click <strong>Analyze</strong>. AI scans the HTML, CSS, and layout so new articles look exactly like your site — same fonts, colors, and spacing.</p>
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
                    className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 shrink-0 ${
                      automation.site_template || automation.site_detail_template
                        ? 'border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-white bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {analyzing
                      ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Analyzing...</>
                      : automation.site_template || automation.site_detail_template
                        ? <><Check className="w-3 h-3 mr-1.5" />Re-analyze</>
                        : <><Search className="w-3 h-3 mr-1.5" />Analyze</>
                    }
                  </button>
                </div>
                {(automation.site_template || automation.site_detail_template) && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span>Template extracted — new articles will match your site's styling</span>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Extra options — collapsed by default */}
            <details>
              <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform [[open]>&]:rotate-180" />
                <span className="text-sm font-medium text-slate-500">Extra options</span>
                <span className="text-xs text-slate-400">optional</span>
              </summary>
              <div className="ml-7 mt-3 space-y-4">
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
                    <p className="text-xs text-slate-400 mt-1">Triggers a rebuild of <strong>your website</strong> (not News Pal). Happens automatically when new articles are published.</p>
                  </div>
                )}

                {/* API URL + Test */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Diagnostics</label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 shrink-0">API:</span>
                    <code className="flex-1 text-xs text-slate-700 font-mono truncate">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/api/articles/public?automation_id={id}
                    </code>
                    <button
                      onClick={copyApiUrl}
                      className="inline-flex items-center px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-600 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />Copy
                    </button>
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="inline-flex items-center px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-600 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {testingConnection ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing...</> : 'Test'}
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Save bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-3">
          <button
            onClick={() => save()}
            disabled={saving}
            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 border border-indigo-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {automation.enabled ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Automation is active
            </span>
          ) : (
            <button
              onClick={async () => {
                setAutomation(prev => prev ? { ...prev, enabled: true } : prev)
                await save({ enabled: true })
                // Auto-trigger pipeline after activation
                setRunningPipeline(true)
                try {
                  const res = await fetch('/api/cron/auto-pipeline', { method: 'POST' })
                  const data = await res.json()
                  const result = data.automations?.find((a: any) => a.automation_id === id)
                  if (result?.rewritten > 0) {
                    showNotification({ type: 'success', title: 'Pipeline complete', message: `${result.rewritten} article(s) published`, duration: 4000 })
                  } else {
                    showNotification({ type: 'warning', title: 'Pipeline complete', message: result?.message || 'No new articles found', duration: 4000 })
                  }
                  loadArticles()
                } catch {
                  showNotification({ type: 'error', title: 'Error', message: 'Pipeline failed' })
                } finally {
                  setRunningPipeline(false)
                }
              }}
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings & Activate'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
