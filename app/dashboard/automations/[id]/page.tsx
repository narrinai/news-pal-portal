'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNotifications } from '../../../../components/NotificationSystem'
import { ArrowLeft, Check, Trash2, Copy, Plus, X, Rss, Shield, Building2, Bot, GraduationCap, Megaphone, Globe, ExternalLink, Link, Search, Loader2, Code, ChevronDown, ChevronRight, ChevronUp, FileText, Calendar, Clock, ArrowRightLeft, ArrowUp, ArrowDown, PenLine, Activity, AlertTriangle, Sparkles, Users, Tag, Settings, HelpCircle, RefreshCw } from 'lucide-react'

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
  framer_collection: string
  tags: string
  target_audience: string
  extra_context: string
  analyze_urls: string
  pipeline_hour: number
  auto_schedule: boolean
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
  content_html?: string
  content_rewritten?: string
  imageUrl?: string
  description?: string
}

// Any platform that uses the /newspal/receive push mechanism (not WordPress or HubSpot which have their own APIs)
function usesPushMechanism(automation: Automation | null): boolean {
  if (!automation?.site_url) return false
  const platform = automation.site_platform
  return platform === 'replit' || platform === 'other' || !platform
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
  const [showReplitHelp, setShowReplitHelp] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [analyzingUrl, setAnalyzingUrl] = useState(false)
  const [discoveringFeeds, setDiscoveringFeeds] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [analyzeUrls, setAnalyzeUrls] = useState<string[]>([''])
  const [showSetup, setShowSetup] = useState(false)
  const [hasMorePublished, setHasMorePublished] = useState(false)
  const [publishedOffset, setPublishedOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAllPending, setShowAllPending] = useState(false)
  const [publishedBanner, setPublishedBanner] = useState<{ title: string; siteUrl?: string } | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [rewritingArticleIds, setRewritingArticleIds] = useState<Set<string>>(new Set())
  const [pushingToSiteIds, setPushingToSiteIds] = useState<Set<string>>(new Set())
  const [deletingFromSiteIds, setDeletingFromSiteIds] = useState<Set<string>>(new Set())
  const [syncingAll, setSyncingAll] = useState(false)

  const id = params?.id as string

  // Auto-publish scheduled articles whose time has passed
  const autoPublishDue = useCallback(async (articleList: Article[]) => {
    const now = new Date()
    const due = articleList.filter(a => a.status === 'selected' && a.publishedAt && new Date(a.publishedAt) <= now)
    if (due.length === 0) return

    for (const article of due) {
      try {
        await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published', automation_id: id }),
        })
        console.log(`[auto-publish] Published: ${article.title}`)
      } catch (err) {
        console.error(`[auto-publish] Failed: ${article.title}`, err)
      }
    }

    // Push only the newly published articles to site
    const dueIds = due.map(a => a.id)
    if (usesPushMechanism(automation)) {
      try {
        const pushRes = await fetch('/api/sites/push-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ automation_id: id, article_ids: dueIds }),
        })
        const pushData = await pushRes.json().catch(() => ({}))
        if (!pushData.success) {
          showNotification({ type: 'error', title: 'Push to site failed', message: pushData.error || 'Could not reach your Replit site. Use "Sync all to site" to retry.' })
        }
      } catch {
        showNotification({ type: 'error', title: 'Push to site failed', message: 'Network error. Use "Sync all to site" to retry.' })
      }
    }
    if (automation?.site_platform === 'hubspot' && automation?.site_api_key) {
      for (const article of due) {
        try {
          await fetch('/api/hubspot/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: automation.site_api_key,
              title: article.title,
              content_html: article.content_html || article.content_rewritten || article.description || '',
              featured_image_url: article.imageUrl || undefined,
              status: 'PUBLISHED',
            }),
          })
        } catch { /* silent */ }
      }
    }
    if (automation?.site_platform === 'wordpress' && automation?.site_api_key && automation?.site_url) {
      const colonIdx = automation.site_api_key.indexOf(':')
      const wpUser = colonIdx > -1 ? automation.site_api_key.slice(0, colonIdx) : ''
      const wpPass = colonIdx > -1 ? automation.site_api_key.slice(colonIdx + 1) : ''
      if (wpUser && wpPass) {
        for (const article of due) {
          try {
            await fetch('/api/wordpress/publish-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                site_url: automation.site_url,
                username: wpUser,
                app_password: wpPass,
                title: article.title,
                content_html: article.content_html || article.content_rewritten || article.description || '',
                featured_image_url: article.imageUrl || undefined,
                tags: (() => { try { return JSON.parse(automation.tags || '[]') } catch { return [] } })(),
                status: 'publish',
              }),
            })
          } catch { /* silent */ }
        }
      }
    }
    if (automation?.deploy_webhook_url) {
      try { await fetch(automation.deploy_webhook_url, { method: 'POST' }) } catch { /* silent */ }
    }

    if (due.length > 0) {
      showNotification({ type: 'success', title: `${due.length} article(s) auto-published`, message: 'Scheduled articles whose time arrived have been published', duration: 4000 })
      loadArticles()
    }
  }, [id, automation])

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
          framer_collection: data.framer_collection || '',
          tags: data.tags || '',
          target_audience: data.target_audience || '',
          extra_context: data.extra_context || '',
          analyze_urls: data.analyze_urls || '',
          pipeline_hour: data.pipeline_hour ?? 7,
          auto_schedule: data.auto_schedule ?? false,
        })
        // Initialize analyzeUrls from analyze_urls field
        if (data.analyze_urls) {
          const urls = data.analyze_urls.split('\n').map((u: string) => u.trim()).filter(Boolean)
          if (urls.length > 0) setAnalyzeUrls(urls)
        }
        if (data.site_platform) {
          setExpandedGuide(data.site_platform)
        }
        // Show setup expanded only if site is not yet configured
        if (!data.site_url) {
          setShowSetup(true)
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

  const loadArticles = async (append = false) => {
    if (!append) setArticlesLoading(true)
    else setLoadingMore(true)
    try {
      const offset = append ? publishedOffset : 0
      const res = await fetch(`/api/articles/by-automation?automation_id=${id}&limit=100&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          const existingIds = new Set(articles.map(a => a.id))
          const newArticles = data.articles.filter((a: Article) => !existingIds.has(a.id))
          setArticles(prev => [...prev, ...newArticles])
        } else {
          setArticles(data.articles)
          setPublishedOffset(0)
          // Auto-publish any scheduled articles whose time has passed
          autoPublishDue(data.articles)
          // Silently fix any published articles missing automation_id
          const unlinked = data.articles.filter((a: Article) => a.status === 'published' && !(a as any).automation_id)
          for (const a of unlinked) {
            fetch(`/api/articles/${a.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ automation_id: id }),
            }).catch(() => {})
          }
        }
        setArticleCounts(data.counts)
        setHasMorePublished(data.pagination?.hasMore || false)
        setPublishedOffset((data.pagination?.publishedOffset || 0) + (data.pagination?.publishedLimit || 20))
      }
    } catch (error) {
      console.error('Error loading articles:', error)
    } finally {
      setArticlesLoading(false)
      setLoadingMore(false)
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
        // Also remove from connected site if configured
        if (automation?.site_url && automation?.site_api_key) {
          const slug = (article.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
          fetch('/api/sites/delete-articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ automation_id: automation.id, slugs: [slug] }),
          }).catch(() => {})
        }
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
  const getKeywordsMap = (): Record<string, any> => {
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

  // Tags helpers
  const getTags = (): string[] => {
    if (!automation?.tags) return []
    try { return JSON.parse(automation.tags) } catch { return [] }
  }

  const setTags = (tags: string[]) => {
    update('tags', JSON.stringify(tags))
  }

  const addTag = (tag: string) => {
    const current = getTags()
    const normalized = tag.trim().toLowerCase()
    if (normalized && !current.map(t => t.toLowerCase()).includes(normalized)) {
      setTags([...current, normalized])
    }
  }

  const removeTag = (tag: string) => {
    setTags(getTags().filter(t => t !== tag))
  }

  // Audience helpers
  const getAudience = (): string[] => {
    if (!automation?.target_audience) return []
    try { return JSON.parse(automation.target_audience) } catch { return [] }
  }

  const setAudience = (audience: string[]) => {
    update('target_audience', JSON.stringify(audience))
  }

  const addAudienceSegment = (input: string) => {
    const current = getAudience()
    const newSegments = input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const merged = [...current]
    for (const s of newSegments) {
      if (!merged.map(a => a.toLowerCase()).includes(s)) merged.push(s)
    }
    setAudience(merged)
  }

  const removeAudienceSegment = (segment: string) => {
    setAudience(getAudience().filter(a => a !== segment))
  }

  // Analyze URL handler — supports up to 3 URLs, merges results
  const handleAnalyzeUrl = async () => {
    const urls = analyzeUrls.filter(u => u.trim())
    if (urls.length === 0) {
      showNotification({ type: 'error', title: 'Missing URL', message: 'Enter at least one URL to analyze' })
      return
    }
    setAnalyzingUrl(true)
    try {
      // Analyze all URLs in parallel
      const results = await Promise.all(
        urls.map(url =>
          fetch('/api/automations/analyze-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, extraContext: automation?.extra_context || '' }),
          }).then(r => r.json()).catch(() => null)
        )
      )

      // Merge tags and audience from all results (deduplicated)
      const allTags = new Set<string>()
      const allAudience = new Set<string>()
      let suggestedName = ''

      for (const data of results) {
        if (!data?.success) continue
        data.tags?.forEach((t: string) => allTags.add(t))
        data.audience?.forEach((a: string) => allAudience.add(a))
        if (!suggestedName && data.suggestedName) suggestedName = data.suggestedName
      }

      const mergedTags = Array.from(allTags)
      const mergedAudience = Array.from(allAudience)

      if (mergedTags.length === 0 && mergedAudience.length === 0) {
        showNotification({ type: 'error', title: 'Analysis failed', message: 'Could not extract tags from the given URL(s)' })
        return
      }

      if (mergedTags.length) setTags(mergedTags)
      if (mergedAudience.length) setAudience(mergedAudience)
      if (suggestedName && automation && !automation.name) update('name', suggestedName)
      if (automation && !automation.site_url) update('site_url', urls[0])

      showNotification({ type: 'success', title: 'Analysis complete', message: `Found ${mergedTags.length} tags and ${mergedAudience.length} audience segments from ${urls.length} URL(s)`, duration: 4000 })

      if (mergedTags.length) {
        handleDiscoverFeeds(mergedTags)
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not reach analysis endpoint' })
    } finally {
      setAnalyzingUrl(false)
    }
  }

  // Discover feeds from tags
  const handleDiscoverFeeds = async (tagsOverride?: string[]) => {
    const tags = tagsOverride || getTags()
    if (tags.length === 0) return
    setDiscoveringFeeds(true)
    try {
      const res = await fetch('/api/automations/discover-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Update feeds and categories
        if (data.feedIds?.length) update('feeds', data.feedIds.join(','))
        if (data.categories?.length) update('categories', data.categories.join(','))
        showNotification({ type: 'success', title: 'Feeds found', message: `${data.summary?.totalFeeds || 0} feeds from ${tags.length} tags`, duration: 3000 })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not discover feeds' })
    } finally {
      setDiscoveringFeeds(false)
    }
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
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        showNotification({ type: 'error', title: 'Save failed', message: errData.error || `HTTP ${res.status}` })
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

  // Auto-save: debounce 1.5s after last change
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const automationRef = useRef(automation)
  automationRef.current = automation

  const autoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaving(true)
    autoSaveTimer.current = setTimeout(async () => {
      const current = automationRef.current
      if (!current) return
      try {
        const { id: _id, ...fields } = current
        await fetch(`/api/automations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
      } catch (err) {
        console.error('[auto-save] failed:', err)
      } finally {
        setAutoSaving(false)
      }
    }, 800)
  }, [id])

  const update = (key: keyof Automation, value: any) => {
    setAutomation(prev => prev ? { ...prev, [key]: value } : prev)
    autoSave()
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

  // Determine if automation is configured (setup complete) or still needs setup
  const hasTags = getTags().length > 0
  const hasFeeds = selectedFeedIds.length > 0 || activeCats.length > 0
  const isConfigured = (hasTags || hasFeeds) && automation.enabled

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
          onClick={() => router.push(`/dashboard/automations/${automation.id}/settings`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors shrink-0"
          title="AI Settings"
        >
          <Settings className="w-4 h-4" />
          AI Settings
        </button>
        {autoSaving && (
          <span className="text-xs text-slate-400 shrink-0">Saving...</span>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          title="Delete automation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Global pipeline banner — visible regardless of configured state */}
      {runningPipeline && (
        <div className="mb-5 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-900">Fetching and rewriting articles...</p>
            <p className="text-xs text-indigo-600 mt-0.5">AI is selecting, filtering, and rewriting articles in your style. This usually takes 3–4 minutes.</p>
          </div>
          <div className="w-full max-w-xs h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Articles overview — only shown prominently when configured (pipeline mode) */}
        {isConfigured && (
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
                    const res = await fetch('/api/cron/auto-pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true, fetchOnly: true }) })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.details || data.error || 'Unknown error')
                    const result = data.automations?.find((a: any) => a.automation_id === id)
                    if (result?.rewritten > 0 || result?.pending > 0) {
                      const parts: string[] = []
                      if (result.rewritten > 0) parts.push(`${result.rewritten} scheduled`)
                      if (result.pending > 0) parts.push(`${result.pending} in pipeline`)
                      showNotification({ type: 'success', title: 'Pipeline complete', message: parts.join(', '), duration: 4000 })
                    } else {
                      showNotification({ type: 'warning', title: 'Pipeline complete', message: result?.message || 'No new articles found', duration: 4000 })
                    }
                    loadArticles()
                  } catch (err: any) {
                    showNotification({ type: 'error', title: 'Pipeline failed', message: err.message || 'Unknown error' })
                  } finally {
                    setRunningPipeline(false)
                  }
                }}
                disabled={runningPipeline || !automation.enabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <Loader2 className={`w-3 h-3 ${runningPipeline ? 'animate-spin' : ''}`} />
                {runningPipeline ? 'Fetching & rewriting articles — this takes about 3-4 min...' : 'Fetch articles'}
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

          {/* Published success banner */}
          {publishedBanner && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Article published!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">"{publishedBanner.title}" is now live{publishedBanner.siteUrl ? ' on your site' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {publishedBanner.siteUrl && (
                  <a
                    href={publishedBanner.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on site
                  </a>
                )}
                <button
                  onClick={() => setPublishedBanner(null)}
                  className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* Summary strip */}
          <div className="flex items-center justify-between gap-4 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last fetched: {(() => {
                  const sorted = [...articles].filter(a => a.createdAt).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                  return sorted.length > 0 ? formatRelativeTime(sorted[0].createdAt!) : 'never'
                })()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Next run: daily at{' '}
                <select
                  value={automation.pipeline_hour ?? 7}
                  onChange={(e) => {
                    const hour = parseInt(e.target.value)
                    update('pipeline_hour', hour)
                  }}
                  className="bg-transparent font-medium text-indigo-600 cursor-pointer hover:text-indigo-800 border-none outline-none text-xs p-0"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
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
              No articles yet. The automation will process articles on the next scheduled run (daily at {String(automation.pipeline_hour ?? 7).padStart(2, '0')}:00).
            </div>
          ) : (() => {
            const isRefusal = (title: string) =>
              /I('m| am) sorry|I('m| am) unable to|I can'?t (perform|assist|help)|Unfortunately,? I cannot/i.test(title)
            const filtered = articles
              .filter(a => !isRefusal(a.title))
            const scheduled = filtered.filter(a => a.status === 'selected' || (a.status === 'rewritten' && rewritingArticleIds.has(a.id)))
              .sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime())
            const published = filtered.filter(a => a.status === 'published' || a.status === 'rewritten')
              .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            const pending = filtered.filter(a => a.status === 'pending')
              .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            const planningSlots = scheduled
            const slotDates = planningSlots.map((_, i) => {
              const d = new Date()
              d.setDate(d.getDate() + i)
              return d
            })
            const planningIds = new Set(planningSlots.map(a => a.id))
            const publishedIds = new Set(published.map(a => a.id))
            const pendingIds = new Set(pending.map(a => a.id))
            const rest = filtered.filter(a => !planningIds.has(a.id) && !publishedIds.has(a.id) && !pendingIds.has(a.id))

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
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 block transition-colors truncate"
                      title={article.title}
                    >
                      {article.title.length > 70 ? article.title.slice(0, 70) + '...' : article.title}
                    </a>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">{article.source}</span>
                    </div>
                  </div>
                  {editingDateId === article.id ? (
                    <input
                      type="datetime-local"
                      defaultValue={article.publishedAt ? article.publishedAt.slice(0, 16) : ''}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleUpdateArticleDate(article.id, new Date(e.target.value).toISOString())
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
                        ? new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + new Date(article.publishedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  )}
                  {rewritingArticleIds.has(article.id) ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 cursor-help" title="AI is rewriting this article — this usually takes about 3-4 minutes">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Rewriting...
                    </span>
                  ) : (
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      article.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : article.status === 'selected'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {article.status === 'published' ? 'Published' : article.status === 'selected' ? 'Scheduled' : article.status}
                    </span>
                  )}
                  {(article.status === 'published' || article.status === 'rewritten') && automation.site_url && (
                    <a
                      href={automation.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View
                    </a>
                  )}
                  {(article.status === 'published' || article.status === 'rewritten') && usesPushMechanism(automation) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setPushingToSiteIds(prev => new Set([...prev, article.id]))
                        try {
                          const res = await fetch('/api/sites/push-articles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ automation_id: id, article_ids: [article.id] }),
                          })
                          const data = await res.json()
                          if (data.success && data.pushed > 0) {
                            showNotification({ type: 'success', title: 'Pushed to site', message: `${data.pushed} article(s) pushed to your site`, duration: 3000 })
                          } else if (data.success && data.pushed === 0) {
                            showNotification({ type: 'error', title: 'Not pushed', message: 'Article not found — save the automation first and try again', duration: 5000 })
                          } else {
                            showNotification({ type: 'error', title: 'Push failed', message: data.error || 'Could not reach your site' })
                          }
                        } catch {
                          showNotification({ type: 'error', title: 'Push failed', message: 'Network error' })
                        } finally {
                          setPushingToSiteIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                        }
                      }}
                      disabled={pushingToSiteIds.has(article.id)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-50"
                      title="Re-push to Replit site"
                    >
                      {pushingToSiteIds.has(article.id) ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ArrowRightLeft className="w-2.5 h-2.5" />}
                      Push
                    </button>
                  )}
                  {(article.status === 'published' || article.status === 'rewritten') && usesPushMechanism(automation) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const slug = (article.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
                        if (!slug) return
                        setDeletingFromSiteIds(prev => new Set([...prev, article.id]))
                        try {
                          const res = await fetch('/api/sites/delete-articles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ automation_id: id, slugs: [slug] }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            // Also delete from Airtable
                            fetch(`/api/articles/${article.id}`, { method: 'DELETE' }).catch(() => {})
                            setArticles(prev => prev.filter(a => a.id !== article.id))
                            showNotification({ type: 'success', title: 'Removed', message: `Article removed from site and database`, duration: 3000 })
                          } else {
                            showNotification({ type: 'error', title: 'Delete failed', message: data.error || 'Could not delete from site' })
                          }
                        } catch {
                          showNotification({ type: 'error', title: 'Delete failed', message: 'Network error' })
                        } finally {
                          setDeletingFromSiteIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                        }
                      }}
                      disabled={deletingFromSiteIds.has(article.id)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Remove from site"
                    >
                      {deletingFromSiteIds.has(article.id) ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                      Remove
                    </button>
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
                    {article.status !== 'pending' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const wasPublished = article.status === 'published'
                          setRewritingArticleIds(prev => { const next = new Set(Array.from(prev)); next.add(article.id); return next })
                          const startContent = article.content_html || ''
                          showNotification({ type: 'info', title: wasPublished ? 'Rewriting & republishing...' : 'Rewriting...', message: `"${article.title}" is being rewritten`, duration: 10000 })
                          // Fire request — don't await, poll instead
                          fetch('/api/articles/rewrite', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: article.id,
                              options: { style: automation.style || 'news', length: automation.length || 'medium', language: automation.language || 'nl', tone: 'informative', targetAudience: (() => { try { const a = JSON.parse(automation.target_audience || '[]'); return a.join(', ') } catch { return '' } })() || undefined },
                              customInstructions: automation.extra_context || undefined,
                            }),
                          }).catch(() => {})
                          // Poll for completion (every 5s, max 2 min)
                          for (let i = 0; i < 24; i++) {
                            await new Promise(r => setTimeout(r, 5000))
                            try {
                              const checkRes = await fetch(`/api/articles/${article.id}`)
                              const checkData = await checkRes.json()
                              if (checkData.content_html && checkData.content_html !== startContent) {
                                // Auto-republish if it was published before
                                if (wasPublished && usesPushMechanism(automation)) {
                                  try {
                                    // Delete old slug from site (in case title changed)
                                    const oldSlug = (article.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
                                    if (oldSlug) {
                                      await fetch('/api/sites/delete-articles', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ automation_id: id, slugs: [oldSlug] }),
                                      }).catch(() => {})
                                    }
                                    // Push new version
                                    const pushRes = await fetch('/api/sites/push-articles', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ automation_id: id, article_ids: [article.id] }),
                                    })
                                    const pushData = await pushRes.json()
                                    if (pushData.success && pushData.pushed > 0) {
                                      showNotification({ type: 'success', title: 'Rewritten & republished', message: `"${checkData.title || article.title}" is live with the new version` })
                                    } else {
                                      showNotification({ type: 'success', title: 'Rewritten', message: `"${checkData.title || article.title}" is done (push failed: ${pushData.error || 'unknown'})` })
                                    }
                                  } catch {
                                    showNotification({ type: 'success', title: 'Rewritten', message: `"${checkData.title || article.title}" is done (republish failed)` })
                                  }
                                } else {
                                  showNotification({ type: 'success', title: 'Rewritten', message: `"${checkData.title || article.title}" is done` })
                                }
                                loadArticles()
                                break
                              }
                            } catch {}
                          }
                          setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                        }}
                        disabled={rewritingArticleIds.has(article.id)}
                        className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                        title={article.status === 'published' ? 'Rewrite & Republish' : 'Rewrite with AI'}
                      >
                        {rewritingArticleIds.has(article.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {!isSlot && article.status !== 'published' && article.status !== 'selected' && (
                      <button
                        onClick={async () => {
                          // Calculate schedule date upfront for optimistic update
                          const pipelineHour = automation.pipeline_hour ?? 7
                          const scheduledDates = articles
                            .filter(a => a.status === 'selected' && a.publishedAt)
                            .map(a => new Date(a.publishedAt).toISOString().split('T')[0])
                          const takenDates = new Set(scheduledDates)
                          const nextDate = new Date()
                          nextDate.setDate(nextDate.getDate() + 1) // always start from tomorrow
                          nextDate.setHours(pipelineHour, 0, 0, 0)
                          while (takenDates.has(nextDate.toISOString().split('T')[0])) {
                            nextDate.setDate(nextDate.getDate() + 1)
                            nextDate.setHours(pipelineHour, 0, 0, 0)
                          }
                          const scheduledIso = nextDate.toISOString()

                          // Optimistic: move to scheduled with date immediately
                          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'selected', publishedAt: scheduledIso } : a))
                          setRewritingArticleIds(prev => { const next = new Set(Array.from(prev)); next.add(article.id); return next })
                          try {
                            // Set status + date first so it appears in scheduled even during rewrite
                            await fetch(`/api/articles/${article.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'selected', publishedAt: scheduledIso }),
                            })
                            // Then rewrite if no content
                            if (!article.content_html && !article.content_rewritten) {
                              await fetch('/api/articles/rewrite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: article.id,
                                  options: { style: automation.style || 'news', length: automation.length || 'medium', language: automation.language || 'nl', tone: 'informative', targetAudience: (() => { try { const a = JSON.parse(automation.target_audience || '[]'); return a.join(', ') } catch { return '' } })() || undefined },
                                  customInstructions: automation.extra_context || undefined,
                                }),
                              })
                              // Re-set status to selected after rewrite (rewrite sets it to 'rewritten')
                              await fetch(`/api/articles/${article.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'selected' }),
                              })
                            }
                            setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                            showNotification({ type: 'success', title: 'Scheduled', message: `"${article.title}" scheduled for ${nextDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${nextDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` })
                            loadArticles()
                          } catch {
                            setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'pending' } : a))
                            showNotification({ type: 'error', title: 'Error', message: 'Could not schedule article' })
                          }
                        }}
                        disabled={rewritingArticleIds.has(article.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        title="Schedule this article"
                      >
                        <Calendar className="w-3 h-3" />
                        Schedule
                      </button>
                    )}
                    {(article.status === 'selected' || article.status === 'pending') && (
                      <button
                        onClick={async () => {
                          setRewritingArticleIds(prev => { const next = new Set(Array.from(prev)); next.add(article.id); return next })
                          try {
                            const needsRewrite = !article.content_html && !article.content_rewritten
                            if (needsRewrite) {
                              showNotification({ type: 'info', title: 'Rewriting...', message: `"${article.title}" is being rewritten before publishing`, duration: 60000 })
                              // Fire background rewrite
                              await fetch('/api/articles/rewrite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: article.id,
                                  options: { style: automation.style || 'news', length: automation.length || 'medium', language: automation.language || 'nl', tone: 'informative', targetAudience: (() => { try { const a = JSON.parse(automation.target_audience || '[]'); return a.join(', ') } catch { return '' } })() || undefined },
                                  customInstructions: automation.extra_context || undefined,
                                }),
                              })
                              // Poll until rewrite is complete (every 5s, max 3 min)
                              let rewriteDone = false
                              for (let i = 0; i < 36; i++) {
                                await new Promise(r => setTimeout(r, 5000))
                                try {
                                  const checkRes = await fetch(`/api/articles/${article.id}`)
                                  const checkData = await checkRes.json()
                                  if (checkData.content_html && checkData.content_html.trim()) {
                                    rewriteDone = true
                                    break
                                  }
                                } catch {}
                              }
                              if (!rewriteDone) {
                                showNotification({ type: 'error', title: 'Rewrite timeout', message: 'Article rewrite is still running. Try publishing again in a minute.' })
                                setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                                return
                              }
                            }
                            // Set status to published
                            await fetch(`/api/articles/${article.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'published', automation_id: id }),
                            })
                            setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                            showNotification({ type: 'success', title: 'Published', message: `"${article.title}" is now published` })
                            setPublishedBanner({ title: article.title, siteUrl: automation.site_url || undefined })
                            loadArticles()
                            // Push to connected site (push-articles handles image search if needed)
                            if (usesPushMechanism(automation) && automation.site_api_key && automation.site_url) {
                              try {
                                const pushRes = await fetch('/api/sites/push-articles', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ automation_id: id, article_ids: [article.id] }),
                                })
                                const pushData = await pushRes.json()
                                if (pushData.success) {
                                  showNotification({ type: 'success', title: 'Pushed to site', message: `${pushData.pushed || 0} article(s) sent to your site`, duration: 3000 })
                                }
                              } catch { /* silent — non-critical */ }
                            }
                            if (automation.site_platform === 'hubspot' && automation.site_api_key) {
                              try {
                                const hsRes = await fetch('/api/hubspot/publish', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    access_token: automation.site_api_key,
                                    title: article.title,
                                    content_html: article.content_html || article.content_rewritten || article.description || '',
                                    featured_image_url: article.imageUrl || undefined,
                                    status: 'PUBLISHED',
                                  }),
                                })
                                const hsData = await hsRes.json()
                                if (hsData.success) {
                                  showNotification({ type: 'success', title: 'Published to HubSpot', message: hsData.message, duration: 3000 })
                                }
                              } catch { /* silent — non-critical */ }
                            }
                            if (automation.site_platform === 'wordpress' && automation.site_api_key && automation.site_url) {
                              const _colonIdx = automation.site_api_key.indexOf(':')
                              const _wpUser = _colonIdx > -1 ? automation.site_api_key.slice(0, _colonIdx) : ''
                              const _wpPass = _colonIdx > -1 ? automation.site_api_key.slice(_colonIdx + 1) : ''
                              if (_wpUser && _wpPass) {
                                try {
                                  const wpRes = await fetch('/api/wordpress/publish-post', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      site_url: automation.site_url,
                                      username: _wpUser,
                                      app_password: _wpPass,
                                      title: article.title,
                                      content_html: article.content_html || article.content_rewritten || article.description || '',
                                      featured_image_url: article.imageUrl || undefined,
                                      tags: (() => { try { return JSON.parse(automation.tags || '[]') } catch { return [] } })(),
                                      status: 'publish',
                                    }),
                                  })
                                  const wpData = await wpRes.json()
                                  if (wpData.success) {
                                    showNotification({ type: 'success', title: 'Published to WordPress', message: wpData.message, duration: 3000 })
                                  }
                                } catch { /* silent — non-critical */ }
                              }
                            }
                            if (automation.site_platform === 'framer' && automation.site_api_key && automation.framer_collection) {
                              try {
                                const framerRes = await fetch('/api/framer/publish', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ automation_id: id, article_ids: [article.id] }),
                                })
                                const framerData = await framerRes.json()
                                if (framerData.success) {
                                  showNotification({ type: 'success', title: 'Published to Framer', message: `${framerData.published || 0} article(s) published`, duration: 3000 })
                                }
                              } catch { /* silent — non-critical */ }
                            }
                            // Trigger deploy webhook if configured
                            if (automation.deploy_webhook_url) {
                              try {
                                await fetch(automation.deploy_webhook_url, { method: 'POST' })
                                showNotification({ type: 'success', title: 'Deploy triggered', message: 'Your site is rebuilding', duration: 3000 })
                              } catch { /* silent */ }
                            }
                          } catch {
                            setRewritingArticleIds(prev => { const next = new Set(prev); next.delete(article.id); return next })
                            showNotification({ type: 'error', title: 'Error', message: 'Could not publish article' })
                          }
                        }}
                        disabled={rewritingArticleIds.has(article.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        title="Publish now"
                      >
                        Publish
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
              <div>
                {planningSlots.length > 0 && (() => {
                  const todayStr = new Date().toISOString().split('T')[0]
                  const publishedToday = published.filter(a => a.publishedAt && a.publishedAt.startsWith(todayStr)).length
                  const scheduledToday = scheduled.filter(a => a.publishedAt && a.publishedAt.startsWith(todayStr)).length
                  const totalToday = publishedToday + scheduledToday
                  const limit = automation.articles_per_day || 1
                  const overLimit = totalToday > limit
                  return (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">
                        Planning — scheduled ({planningSlots.length})
                      </p>
                      {overLimit && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium" title={`Output setting: ${limit}/day. Today: ${publishedToday} published + ${scheduledToday} scheduled = ${totalToday}`}>
                          {totalToday}/{limit} today — exceeds daily limit
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                    {planningSlots.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-1">
                        {planningSlots.length > 1 && (
                          <div className="flex flex-col shrink-0 w-5">
                            {i > 0 && (
                              <button
                                onClick={() => {
                                  // Optimistic reorder — swap in local state
                                  const prev = planningSlots[i - 1]
                                  const prevDate = prev.publishedAt
                                  const thisDate = a.publishedAt
                                  setArticles(arts => arts.map(art => {
                                    if (art.id === a.id) return { ...art, publishedAt: prevDate }
                                    if (art.id === prev.id) return { ...art, publishedAt: thisDate }
                                    return art
                                  }))
                                  // Persist in background
                                  Promise.all([
                                    fetch(`/api/articles/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publishedAt: prevDate }) }),
                                    fetch(`/api/articles/${prev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publishedAt: thisDate }) }),
                                  ]).catch(() => loadArticles())
                                }}
                                className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {i < planningSlots.length - 1 && (
                              <button
                                onClick={() => {
                                  const next = planningSlots[i + 1]
                                  const nextDate = next.publishedAt
                                  const thisDate = a.publishedAt
                                  setArticles(arts => arts.map(art => {
                                    if (art.id === a.id) return { ...art, publishedAt: nextDate }
                                    if (art.id === next.id) return { ...art, publishedAt: thisDate }
                                    return art
                                  }))
                                  Promise.all([
                                    fetch(`/api/articles/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publishedAt: nextDate }) }),
                                    fetch(`/api/articles/${next.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publishedAt: thisDate }) }),
                                  ]).catch(() => loadArticles())
                                }}
                                className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex-1">{renderArticleRow(a, true, slotDates[i])}</div>
                      </div>
                    ))}
                    </div>
                  </div>
                  )})()}
                {pending.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide mb-1.5 px-1">
                      Pipeline — available to schedule <span className="text-slate-400 normal-case font-normal">({pending.length})</span>
                    </p>
                    {(showAllPending ? pending : pending.slice(0, 10)).map((a, i, arr) => (
                      <div key={a.id} className={i < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                        {renderArticleRow(a, false)}
                      </div>
                    ))}
                    {pending.length > 10 && !showAllPending && (
                      <button
                        onClick={() => setShowAllPending(true)}
                        className="w-full mt-2 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                      >
                        Show {pending.length - 10} more articles
                      </button>
                    )}
                    {showAllPending && pending.length > 10 && (
                      <button
                        onClick={() => setShowAllPending(false)}
                        className="w-full mt-2 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
                {published.length > 0 && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">
                          Published ({published.length})
                        </p>
                        <a
                          href={`/api/articles/public?automation_id=${id}&limit=5`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                          title="Check what articles the public API returns for this automation"
                        >
                          check API
                        </a>
                      </div>
                      {usesPushMechanism(automation) && (
                        <button
                          onClick={async () => {
                            setSyncingAll(true)
                            try {
                              const res = await fetch('/api/sites/push-articles', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ automation_id: id }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                showNotification({ type: 'success', title: 'Synced to site', message: `${data.pushed || 0} article(s) pushed to your Replit site`, duration: 4000 })
                              } else {
                                showNotification({ type: 'error', title: 'Sync failed', message: data.error || 'Could not reach your site' })
                              }
                            } catch {
                              showNotification({ type: 'error', title: 'Sync failed', message: 'Network error' })
                            } finally {
                              setSyncingAll(false)
                            }
                          }}
                          disabled={syncingAll}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                        >
                          {syncingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                          Sync all to site
                        </button>
                      )}
                    </div>
                    {published.map((a, i, arr) => (
                      <div key={a.id} className={i < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                        {renderArticleRow(a, false)}
                      </div>
                    ))}
                    {hasMorePublished && (
                      <button
                        onClick={() => loadArticles(true)}
                        disabled={loadingMore}
                        className="w-full mt-2 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading...' : 'Load more published articles'}
                      </button>
                    )}
                  </div>
                )}
                {rest.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 px-1">
                      Other
                    </p>
                    {rest.map(a => renderArticleRow(a, false))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        )}

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
                <option value="longform">Longform ~10 min read (2500-3500 words)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Language</label>
              <select value={automation.language} onChange={(e) => update('language', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="nl">Dutch</option>
                <option value="en">English</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>

          {/* Auto-schedule toggle */}
          <div className="mt-4 flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <button
              onClick={() => update('auto_schedule', !automation.auto_schedule)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${
                automation.auto_schedule ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              role="switch"
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                automation.auto_schedule ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
            <div>
              <p className="text-sm font-medium text-slate-700">Auto-schedule articles</p>
              <p className="text-xs text-slate-400 mt-0.5">
                When enabled, the daily pipeline automatically selects, rewrites, and schedules the top articles based on your settings above.
                When disabled, articles are only fetched into the pipeline — you choose which ones to schedule manually.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Advanced — collapsible */}
        <div className="bg-white rounded-lg border border-slate-200">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center gap-2 p-5 text-left hover:bg-slate-50 transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <h3 className="text-sm font-semibold text-slate-900">Content Settings</h3>
            <span className="text-xs text-slate-400">Tags, audience, categories, keywords, and RSS feeds</span>
          </button>

          {(showAdvanced || !isConfigured) && (
          <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">

        {/* ── Step 1: Analyze your site ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <span className="text-sm font-medium text-slate-800">Analyze your site</span>
            <span className="text-xs text-slate-400">up to 3 URLs for better context</span>
          </div>
          <div className="ml-8 space-y-2">
            {analyzeUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  placeholder={i === 0 ? 'https://yoursite.com' : 'https://yoursite.com/another-page'}
                  value={url}
                  onChange={(e) => {
                    const updated = [...analyzeUrls]
                    updated[i] = e.target.value
                    setAnalyzeUrls(updated)
                    // Save analyze URLs
                    update('analyze_urls', updated.filter(u => u.trim()).join('\n'))
                  }}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {i > 0 && (
                  <button
                    onClick={() => {
                      const updated = analyzeUrls.filter((_, j) => j !== i)
                      setAnalyzeUrls(updated)
                      update('analyze_urls', updated.filter(u => u.trim()).join('\n'))
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              {analyzeUrls.length < 10 && (
                <button
                  onClick={() => setAnalyzeUrls([...analyzeUrls, ''])}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add URL
                </button>
              )}
            </div>
            <textarea
              placeholder="Extra AI instructions (optional) — e.g. 'always mention our brand name', 'focus on Dutch market impact', 'use a casual tone'..."
              value={automation?.extra_context || ''}
              onChange={(e) => update('extra_context', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>
        </div>

        {/* ── Step 2: Analyze ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <span className="text-sm font-medium text-slate-800">Analyze</span>
            <span className="text-xs text-slate-400">auto-detect tags, audience, and select feeds</span>
          </div>
          <div className="ml-8">
            <button
              onClick={handleAnalyzeUrl}
              disabled={analyzingUrl || !analyzeUrls.some(u => u.trim())}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40 shadow-sm"
            >
              {analyzingUrl
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                : <><Sparkles className="w-4 h-4" />Analyze &amp; auto-configure</>
              }
            </button>

            {/* Tags result */}
            {getTags().length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Detected tags</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-5">Used as tags and for filtering relevant articles</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getTags().map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-medium">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-indigo-400 hover:text-indigo-700 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={async () => {
                      const input = await showPrompt({ title: 'Add tag', message: 'Enter one or more topic tags, separated by commas:', promptPlaceholder: 'e.g. pricing, ecommerce, retail', confirmText: 'Add', cancelText: 'Cancel' })
                      if (input) input.split(',').forEach(t => addTag(t.trim()))
                    }}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3 h-3" />Add
                  </button>
                </div>
              </div>
            )}

            {/* Audience result */}
            {getAudience().length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs font-medium text-slate-600">Target audience</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-5">The AI writes articles specifically targeted at these audiences</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getAudience().map((segment) => (
                    <span key={segment} className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 rounded-full px-3 py-1 text-xs font-medium">
                      {segment}
                      <button onClick={() => removeAudienceSegment(segment)} className="text-violet-400 hover:text-violet-700 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={async () => {
                      const input = await showPrompt({ title: 'Add audience segment', message: 'Enter one or more target audiences (comma-separated):', promptPlaceholder: 'e.g. marketing managers, HR professionals', confirmText: 'Add', cancelText: 'Cancel' })
                      if (input) addAudienceSegment(input)
                    }}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3 h-3" />Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 3: Feed selection ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
            <span className="text-sm font-medium text-slate-800">Feed selection</span>
            <span className="text-xs text-slate-400">{selectedFeedIds.length} / {allFeeds.length} selected</span>
          </div>
          <div className="ml-8">

          {allFeeds.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No feeds configured yet.</p>
          ) : (() => {
            // Group feeds by user-friendly display categories instead of internal category names
            const displayGroups: Record<string, { label: string, feedIds: string[] }> = {
              'security': { label: 'Security', feedIds: [] },
              'ai': { label: 'AI & Technology', feedIds: [] },
              'marketing': { label: 'Marketing', feedIds: [] },
              'european': { label: 'European Tech & Privacy', feedIds: [] },
              'dutch-tech': { label: 'Dutch Tech & News', feedIds: [] },
              'german': { label: 'German Tech & News', feedIds: [] },
              'other': { label: 'Other', feedIds: [] },
            }

            // Map internal categories to display groups
            const categoryToGroup: Record<string, string> = {
              'cybersecurity': 'security',
              'ai-companion': 'ai',
              'ai-learning': 'ai',
              'marketingtoolz': 'marketing',
              'europeanpurpose': 'european',
              'bouwcertificaten': 'dutch-tech',
              'german-news': 'german',
              'german-tech': 'german',
              'german-business': 'german',
            }

            // Some feeds should be in specific groups based on their name/content
            const dutchFeedIds = new Set(['security-nl-default', 'tweakers', 'nu-tech', 'tweakers-bouw', 'computable', 'iculture', 'tweakers-eu'])

            for (const feed of allFeeds) {
              if (dutchFeedIds.has(feed.id)) {
                displayGroups['dutch-tech'].feedIds.push(feed.id)
              } else {
                const group = categoryToGroup[feed.category] || 'other'
                displayGroups[group].feedIds.push(feed.id)
              }
            }

            // Sort: groups with selected feeds first
            const sortedGroups = Object.entries(displayGroups)
              .filter(([, g]) => g.feedIds.length > 0)
              .sort((a, b) => {
                const aSelected = a[1].feedIds.some(id => selectedFeedIds.includes(id)) ? 0 : 1
                const bSelected = b[1].feedIds.some(id => selectedFeedIds.includes(id)) ? 0 : 1
                return aSelected - bSelected
              })

            const feedMap = new Map(allFeeds.map(f => [f.id, f]))

            return (
              <div className="space-y-4">
                {sortedGroups.map(([groupKey, group]) => {
                  const groupFeeds = group.feedIds.map(id => feedMap.get(id)).filter(Boolean) as Feed[]
                  const selectedCount = groupFeeds.filter(f => selectedFeedIds.includes(f.id)).length
                  const allGroupSelected = groupFeeds.length > 0 && selectedCount === groupFeeds.length
                  const someGroupSelected = selectedCount > 0 && selectedCount < groupFeeds.length

                  const toggleAllGroupFeeds = () => {
                    const ids = groupFeeds.map(f => f.id)
                    const current = getSelectedFeedIds()
                    const updated = allGroupSelected
                      ? current.filter(id => !ids.includes(id))
                      : Array.from(new Set([...current, ...ids]))
                    update('feeds', updated.join(','))
                  }

                  return (
                    <div key={groupKey}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          onClick={toggleAllGroupFeeds}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                            allGroupSelected ? 'bg-indigo-600 border-indigo-600' : someGroupSelected ? 'bg-indigo-300 border-indigo-400' : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {(allGroupSelected || someGroupSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {group.label}
                        </span>
                        <span className="text-xs text-slate-400">{selectedCount}/{groupFeeds.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 ml-6">
                        {groupFeeds.map((feed) => {
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
            )
          })()}

            {/* Add custom feed */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-600 mb-2">Add your own RSS feed</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  id="custom-feed-url"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Feed name"
                  id="custom-feed-name"
                  className="w-40 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={async () => {
                    const urlInput = document.getElementById('custom-feed-url') as HTMLInputElement
                    const nameInput = document.getElementById('custom-feed-name') as HTMLInputElement
                    const feedUrl = urlInput?.value?.trim()
                    const feedName = nameInput?.value?.trim()
                    if (!feedUrl) {
                      showNotification({ type: 'error', title: 'Missing URL', message: 'Enter a feed URL' })
                      return
                    }
                    try {
                      const res = await fetch('/api/feeds', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          url: feedUrl,
                          name: feedName || new URL(feedUrl).hostname,
                          category: activeCats[0] || 'other',
                          enabled: true,
                        }),
                      })
                      if (res.ok) {
                        const data = await res.json()
                        const addedFeed = data.feed || data
                        showNotification({ type: 'success', title: 'Feed added', message: `${addedFeed.name || feedName} has been added`, duration: 3000 })
                        // Add to selected feeds
                        if (addedFeed.id) {
                          const current = getSelectedFeedIds()
                          update('feeds', [...current, addedFeed.id].join(','))
                        }
                        urlInput.value = ''
                        nameInput.value = ''
                        await loadFeeds()
                      } else {
                        showNotification({ type: 'error', title: 'Failed', message: 'Could not add feed' })
                      }
                    } catch {
                      showNotification({ type: 'error', title: 'Error', message: 'Could not add feed' })
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Step 4: Keywords ── */}
        {activeCats.length > 0 && (
        <div>
          <details>
            <summary className="flex items-center gap-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <span className="text-sm font-medium text-slate-800">Keywords</span>
              <span className="text-xs text-slate-400">optional — fine-tune article filtering</span>
              <ChevronRight className="w-4 h-4 text-slate-400 transition-transform [[open]>&]:rotate-90" />
            </summary>

            <div className="ml-8 space-y-4 mt-3">
              {/* Keyword filtering toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Keyword filtering</p>
                  <p className="text-xs text-slate-400 mt-0.5">When off, all articles from selected feeds are accepted without keyword matching</p>
                </div>
                <button
                  onClick={() => {
                    const current = getKeywordsMap()
                    const isDisabled = current._disabled === true
                    if (isDisabled) {
                      delete current._disabled
                    } else {
                      current._disabled = true as any
                    }
                    update('keywords', JSON.stringify(current))
                  }}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                    !(getKeywordsMap() as any)._disabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    !(getKeywordsMap() as any)._disabled ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
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
          </details>
        </div>
        )}

        {/* ── Step 5: Save ── */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">5</div>
          <button
            onClick={() => save()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

          </div>
          )}
        </div>

        {/* Section 5: Connected Site — always shown, collapsed when configured */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <button
            onClick={() => setShowSetup(s => !s)}
            className="w-full flex items-center gap-2 text-left"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showSetup ? 'rotate-90' : ''}`} />
            <h3 className="text-sm font-semibold text-slate-900 flex-1">Publish to your website</h3>
            {automation.site_platform && automation.site_url && !showSetup && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {automation.site_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
              </span>
            )}
          </button>
          {showSetup && <div className="mt-4">

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
                  (automation.site_platform === 'framer' && automation.site_api_key) ||
                  (automation.site_platform === 'hubspot' && automation.site_api_key) ||
                  (automation.site_platform === 'wordpress' && automation.site_api_key && automation.site_url) ||
                  automation.site_platform === 'other'
                ) ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                )}
                <span className="text-sm font-medium text-slate-800">Choose your platform</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 ml-7">
                {[
                  { key: 'netlify', label: 'Netlify', desc: 'Static sites & SSG', logo: '/images/platforms/netlify.png' },
                  { key: 'wordpress', label: 'WordPress', desc: 'Blog & CMS', logo: '/images/platforms/wordpress.png' },
                  { key: 'replit', label: 'Replit', desc: 'Hosted web apps', logo: '/images/platforms/replit.png' },
                  { key: 'framer', label: 'Framer', desc: 'Design-first sites', logo: '/images/platforms/framer.svg' },
                  { key: 'hubspot', label: 'HubSpot', desc: 'CMS & Blog', logo: '/images/platforms/hubspot.svg' },
                  { key: 'other', label: 'Other', desc: 'Any website', logo: null },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setExpandedGuide(expandedGuide === p.key ? null : p.key)
                      update('site_platform', p.key)
                      if (p.key === 'replit' || p.key === 'hubspot' || p.key === 'framer') {
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
                      ) : (p as any).hubspot ? (
                        <span className={`text-xs font-black ${expandedGuide === p.key ? 'text-orange-500' : 'text-orange-400'}`}>HS</span>
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
                          const apiBase = 'https://newspalportal.netlify.app'
                          const netlifyPrompt = `Integrate News Pal articles into my existing site (${automation.site_url || 'my website'}). My site already has a news/blog page and article detail pages. The articles from News Pal should appear in my existing design as if they are native content — same cards, same layout, same styling.

## API Endpoint
GET ${apiBase}/api/articles/public?automation_id=${id}&limit=50

Returns JSON:
{
  "success": true,
  "articles": [
    {
      "id": "recXXX",
      "title": "Article title",
      "description": "Short summary (max 200 chars)",
      "content": "Plain text content",
      "html": "<section><h2>Heading</h2><p>Paragraph</p></section>",
      "category": "Category Name",
      "source": "Source Name",
      "sourceUrl": "https://original-url.com",
      "imageUrl": "https://...",
      "subtitle": "One-line subtitle under the title",
      "publishedAt": "2026-03-11T07:00:00.000Z",
      "faq": [{"question":"Question?","answer":"Answer text"}]
    }
  ]
}

## What to do
- Fetch articles from the API above at BUILD TIME and merge them into the existing news/article overview page — same grid, same card design, same styling as articles already on the site
- For each article, create a detail page using my site's existing article/detail page template and layout
- On the detail page: render the html field directly (it's pre-formatted HTML with <section>, <h2>, <p>, <ul> tags). Style these tags to match my site's typography.
- If faq exists (array of {question, answer} objects), render as a collapsible FAQ section on the detail page
- Generate slugs from title: lowercase, replace non-alphanumeric with hyphens, max 80 chars
- Add og:title, og:description, og:image meta tags on detail pages for SEO
- Nothing new needs to be designed — use my existing pages and components, just add the API data source
- KEEP existing articles/content on the site — add News Pal articles alongside them, not instead of them

## Deploy hook (important!)
Set up a Netlify Build Hook so the site rebuilds daily with fresh articles:
1. Netlify dashboard → Site configuration → Build & deploy → Build hooks
2. Add build hook → Name: "News Pal" → Copy the URL
3. Give me the webhook URL — I need to paste it into News Pal so it triggers a rebuild when new articles are published${automation.site_detail_template ? `

## Styling reference
Below is the extracted HTML/CSS from an existing article page. News Pal articles MUST match this exact styling:

${automation.site_detail_template}` : ''}${automation.site_template ? `

## Card/listing styling reference
Below is the extracted HTML/CSS for article cards on the listing page:

${automation.site_template}` : ''}`
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
              {expandedGuide === 'wordpress' && (() => {
                const wpCreds = automation.site_api_key || ''
                const colonIdx = wpCreds.indexOf(':')
                const wpUser = colonIdx > -1 ? wpCreds.slice(0, colonIdx) : wpCreds
                const wpPass = colonIdx > -1 ? wpCreds.slice(colonIdx + 1) : ''
                const hasCredentials = !!(automation.site_url && wpUser && wpPass)
                return (
                <div className="ml-7 mt-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs text-slate-600 mb-3">News Pal publishes articles <strong>directly as native WordPress blog posts</strong> — no plugin needed. Just enter your WordPress URL and an Application Password.</p>
                  <div className="space-y-3">

                    {/* Step 1: Site URL */}
                    <div className="flex gap-2.5">
                      {automation.site_url ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Enter your WordPress URL</p>
                        <input
                          type="url"
                          value={automation.site_url || ''}
                          onChange={e => update('site_url', e.target.value)}
                          placeholder="https://yoursite.com"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    {/* Step 2: Application Password */}
                    <div className="flex gap-2.5">
                      {hasCredentials ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-0.5">Create an Application Password</p>
                        <p className="text-slate-400 mb-2">WordPress admin → <strong>Users → Profile</strong> → scroll down to <strong>Application Passwords</strong> → enter a name (e.g. "News Pal") and click <strong>Add New Application Password</strong>.</p>
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={wpUser}
                            onChange={e => update('site_api_key', `${e.target.value}:${wpPass}`)}
                            placeholder="WordPress username"
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
                          />
                          <input
                            type="password"
                            value={wpPass}
                            onChange={e => update('site_api_key', `${wpUser}:${e.target.value}`)}
                            placeholder="Application Password (e.g. xxxx xxxx xxxx xxxx xxxx xxxx)"
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Test connection */}
                    <div className="flex gap-2.5">
                      {hasCredentials ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Test the connection</p>
                        <button
                          onClick={async () => {
                            if (!automation.site_url || !wpUser || !wpPass) {
                              showNotification({ type: 'error', title: 'Missing fields', message: 'Please fill in your WordPress URL, username and Application Password' })
                              return
                            }
                            setTestingConnection(true)
                            try {
                              const res = await fetch('/api/wordpress/test-automation', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ site_url: automation.site_url, username: wpUser, app_password: wpPass }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                showNotification({ type: 'success', title: 'Connection successful', message: data.message, duration: 4000 })
                              } else {
                                showNotification({ type: 'error', title: 'Connection failed', message: data.message })
                              }
                            } catch {
                              showNotification({ type: 'error', title: 'Error', message: 'Could not test the connection' })
                            } finally {
                              setTestingConnection(false)
                            }
                          }}
                          disabled={testingConnection || !automation.site_url || !wpUser || !wpPass}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          {testingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Test connection
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">Done! Save settings and articles will be published automatically as WordPress blog posts.</span>
                    </div>
                  </div>
                </div>
                )
              })()}
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
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Copy this prompt and paste it in Replit AI</p>
                        <p className="mb-1.5">Open your Replit project, open the AI chat, and paste this prompt. It will set everything up for you.</p>
                        {(() => {
                            const siteUrl = automation.site_url || ''
                            const sitePath = (() => { try { return new URL(siteUrl).pathname.replace(/\/$/, '') || '/news' } catch { return '/news' } })()
                            const slugPath = `${sitePath}/:slug`
                            const lastSegment = sitePath.split('/').filter(Boolean).pop() || 'news'
                            const apiBase = 'https://newspalportal.netlify.app'
                            const prompt = `Add a News Pal integration to my project. This uses a hybrid approach: articles are synced from a remote API into persistent local storage, so they survive deploys and can be edited locally. These articles must live ALONGSIDE my existing content — never replace, delete, or interfere with articles that are already on the site.

## How it works
1. On server startup, automatically sync new articles from the News Pal API into Replit Database (persistent key-value store that survives deploys)
2. Your ${sitePath} page reads from local Replit Database — fast, always available, locally editable
3. A manual sync endpoint lets you pull new articles on demand: GET /newspal/sync
4. Existing articles that were already synced and potentially edited locally are NEVER overwritten — only new articles (by slug) are added

## API endpoint (already running, read-only — do NOT modify this external API)
GET ${apiBase}/api/articles/public?automation_id=${automation.id}&limit=50
Returns: { success: true, total: number, articles: [...] }

## Requirements
- Install @replit/database: npm install @replit/database
- Use Replit Database (const Database = require("@replit/database"); const db = new Database()) for article storage — NOT JSON files (those get wiped on redeploy)
- Store each article under key "newspal_article_<slug>" and keep an index at key "newspal_slugs" (JSON array of slug strings)

### Routes to create:
- GET /newspal/sync — fetch articles from the API, generate slug from each title (lowercase, replace non-alphanumeric with hyphens), add only NEW articles (slug not in existing index) to Replit Database. Do NOT overwrite articles that already exist locally (they may have been edited). Return { synced: number, total: number }.
- POST /newspal/receive — accepts { articles: [...] } with header x-newspal-key validated against env var NEWSPAL_API_KEY. Same storage logic as sync: store in Replit Database, deduplicate by slug, update if exists. Return { success, received, total }. This is a fallback push endpoint.
- POST /newspal/delete — accepts { slugs: ["slug1", "slug2"] } with header x-newspal-key validated against NEWSPAL_API_KEY. Delete the specified articles by slug from Replit Database and remove from index. Return { success, deleted: number, remaining: number }.
- GET ${sitePath} — read all articles from Replit Database, render a listing page showing BOTH existing site articles AND News Pal articles together, sorted by date. Use cards (image, category badge, title linking to ${slugPath}, description, date). Style it to match the existing site design. CRITICAL: If the listing has a featured/highlight/hero section AND a grid section, the same article must NEVER appear in both — exclude the featured article(s) from the grid below by slug.
- GET ${slugPath} — read single article from Replit Database by slug, render a full article detail page with title, subtitle, meta info, image, HTML content, and FAQ section (collapsible). Must work for both existing articles and News Pal articles. Style it to match the existing site. Include ALL page elements that existing article pages have — such as sidebars, breadcrumbs, social share buttons, navigation between articles, etc.
- Register the /newspal/receive route BEFORE any security middleware (helmet, cors, csrf, etc.)
- Add NEWSPAL_API_KEY to the environment/secrets with value: ${automation.site_api_key || '(generate key in News Pal first)'}
- On server startup, call syncArticles() once to automatically pull any new articles from the API

### Sync logic:
\`\`\`
async function syncArticles() {
  const res = await fetch('${apiBase}/api/articles/public?automation_id=${automation.id}&limit=50');
  const { articles } = await res.json();
  const existingSlugs = JSON.parse((await db.get('newspal_slugs')) || '[]');
  const existingSet = new Set(existingSlugs);
  let synced = 0;
  for (const a of articles) {
    const slug = toSlug(a.title);
    if (!existingSet.has(slug)) {
      await db.set('newspal_article_' + slug, JSON.stringify({ ...a, slug }));
      existingSlugs.push(slug);
      synced++;
    }
  }
  await db.set('newspal_slugs', JSON.stringify(existingSlugs));
  return { synced, total: existingSlugs.length };
}
\`\`\`

## Coexistence with existing content
- NEVER touch, overwrite, or delete existing articles, pages, blog posts, or any other content on the site
- News Pal articles live in Replit Database — completely separate from existing content
- On listing pages (${sitePath}), merge News Pal articles with existing articles and sort by date, so they appear as one unified feed
- On detail pages (${slugPath}), check both existing content and News Pal storage to find the article by slug
- If the site already has routes for ${sitePath} or ${slugPath}, extend those route handlers to also include News Pal articles — do not create duplicate routes

## Article data format from API
Each article has:
{
  "id": "recXXX",
  "title": "Article title",
  "description": "Short summary",
  "content": "Plain text content",
  "html": "<section>...</section>",
  "category": "${lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'News'}",
  "source": "Original Source",
  "sourceUrl": "https://original-url.com",
  "imageUrl": "https://...",
  "subtitle": "One-line subtitle",
  "publishedAt": "2026-03-11T07:00:00.000Z",
  "faq": [{"question":"..","answer":".."}]
}

## Important
- The html field is already formatted with <section>, <h2>, <p>, <ul> tags — render it directly
- faq is already a parsed array of {question, answer} objects — render as collapsible Q&A
- All pages must match my existing site's design (fonts, colors, layout, spacing)
- CRITICAL: Do NOT add CSRF protection, referrer checks, origin validation, or cors() restrictions to /newspal/receive — it uses x-newspal-key for authentication
- CRITICAL: Make sure /newspal/receive is reachable before any security middleware runs
- CRITICAL: Use Replit Database (@replit/database) for storage — NOT JSON files. JSON files on the filesystem get wiped on every redeploy. This is the #1 cause of articles disappearing.
- SITEMAP: Add News Pal articles to the site's sitemap.xml so they get indexed by search engines${automation.site_detail_template ? `

## Styling reference
Below is the extracted HTML/CSS from an existing article page on my site. News Pal articles MUST match this exact styling — same fonts, colors, spacing, layout, header image placement, and typography. Use this as the reference template:

${automation.site_detail_template}` : ''}${automation.site_template ? `

## Card/listing styling reference
Below is the extracted HTML/CSS for article cards on the listing page. News Pal article cards must match this styling:

${automation.site_template}` : ''}`
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
                            <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto"><code id="replit-snippet-code">{`// newspal.js — News Pal with Replit Database (survives deploys)
const Database = require('@replit/database');
const db = new Database();
const API_URL = 'https://newspalportal.netlify.app/api/articles/public?automation_id=${automation.id}&limit=50';

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function syncArticles() {
  try {
    const res = await fetch(API_URL);
    const { articles } = await res.json();
    const existingSlugs = JSON.parse((await db.get('newspal_slugs')) || '[]');
    const existingSet = new Set(existingSlugs);
    let synced = 0;
    for (const a of articles) {
      const slug = toSlug(a.title);
      if (!existingSet.has(slug)) {
        await db.set('newspal_article_' + slug, JSON.stringify({ ...a, slug }));
        existingSlugs.push(slug);
        synced++;
      }
    }
    await db.set('newspal_slugs', JSON.stringify(existingSlugs));
    console.log('[NewsPal] Synced ' + synced + ' new, ' + existingSlugs.length + ' total');
    return { synced, total: existingSlugs.length };
  } catch (e) { console.error('[NewsPal] sync error:', e); return { synced: 0, error: e.message }; }
}

async function getAllArticles() {
  const slugs = JSON.parse((await db.get('newspal_slugs')) || '[]');
  const articles = [];
  for (const slug of slugs) {
    const raw = await db.get('newspal_article_' + slug);
    if (raw) articles.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
  }
  return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

module.exports = function(app) {
  app.get('/newspal/sync', async (req, res) => res.json(await syncArticles()));

  app.post('/newspal/receive', (req, res) => {
    const key = req.headers['x-newspal-key'];
    if (key !== process.env.NEWSPAL_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    // store via same DB logic
    (async () => {
      const slugs = JSON.parse((await db.get('newspal_slugs')) || '[]');
      const set = new Set(slugs);
      let received = 0;
      for (const a of (req.body.articles || [])) {
        const slug = a.slug || toSlug(a.title);
        await db.set('newspal_article_' + slug, JSON.stringify({ ...a, slug }));
        if (!set.has(slug)) { slugs.push(slug); set.add(slug); }
        received++;
      }
      await db.set('newspal_slugs', JSON.stringify(slugs));
      res.json({ success: true, received, total: slugs.length });
    })().catch(e => res.status(500).json({ error: e.message }));
  });

  // Sync on startup
  syncArticles();
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
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
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
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">4</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Test the connection</p>
                        <p className="mb-2">Make sure your Replit site is running, then click the button to send a test article.</p>
                        <div className="flex items-center gap-3">
                        <button
                          onClick={testPush}
                          disabled={pushingTest || !automation.site_url || !automation.site_api_key}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40"
                        >
                          {pushingTest ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending test article...</> : 'Send test article'}
                        </button>
                        <button
                          onClick={() => setShowReplitHelp(!showReplitHelp)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                          Troubleshooting
                          {showReplitHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        </div>
                        {showReplitHelp && (
                          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-3">
                            <div>
                              <p className="font-medium text-slate-700 mb-1">403 Forbidden</p>
                              <p className="mb-1.5">Make sure <code className="bg-slate-100 px-1 rounded">registerNewspal(app)</code> is called <strong>before</strong> any <code className="bg-slate-100 px-1 rounded">app.use(helmet())</code> or <code className="bg-slate-100 px-1 rounded">cors()</code> middleware.</p>
                              <button onClick={() => { navigator.clipboard.writeText('Move registerNewspal(app) to the top of your server file, before any app.use(helmet()) or cors() middleware. registerNewspal must be the first middleware registered.'); showNotification({ type: 'success', title: 'Copied', message: 'Fix prompt copied', duration: 2000 }) }} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Copy className="w-2.5 h-2.5" /> Copy fix prompt
                              </button>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 mb-1">404 Not Found</p>
                              <p className="mb-1.5">The News Pal routes are not registered. Make sure <code className="bg-slate-100 px-1 rounded">registerNewspal(app)</code> is in your server file.</p>
                              <button onClick={() => { navigator.clipboard.writeText('Add registerNewspal(app) to your Express server file. This registers the /newspal/push endpoint that receives articles from News Pal.'); showNotification({ type: 'success', title: 'Copied', message: 'Fix prompt copied', duration: 2000 }) }} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Copy className="w-2.5 h-2.5" /> Copy fix prompt
                              </button>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 mb-1">500 Server Error</p>
                              <p className="mb-1.5">Something crashed in the push handler. Check your Replit logs for the stack trace.</p>
                              <button onClick={() => { navigator.clipboard.writeText('Check the Replit console logs for errors in the /newspal/push route handler. The push endpoint is crashing — look for undefined variables, missing database tables, or file system errors.'); showNotification({ type: 'success', title: 'Copied', message: 'Fix prompt copied', duration: 2000 }) }} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Copy className="w-2.5 h-2.5" /> Copy fix prompt
                              </button>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 mb-1">Connection refused / timeout</p>
                              <p className="mb-1.5">Your Replit site is not running or the URL is incorrect. Use the deployment URL, not the editor URL.</p>
                              <button onClick={() => { navigator.clipboard.writeText('Make sure your Replit project is deployed and running. Use the deployment URL (e.g. https://your-project.replit.app), not the editor URL (replit.com/@...).'); showNotification({ type: 'success', title: 'Copied', message: 'Fix prompt copied', duration: 2000 }) }} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Copy className="w-2.5 h-2.5" /> Copy fix prompt
                              </button>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 mb-1">Existing articles disappeared</p>
                              <p className="mb-1.5">News Pal articles replaced your existing content instead of appearing alongside it.</p>
                              <button onClick={() => { navigator.clipboard.writeText(`CRITICAL BUG: News Pal articles are REPLACING my existing articles instead of appearing alongside them. Fix this:

1. News Pal articles must be stored SEPARATELY from existing site articles — in their own JSON file (e.g. newspal-articles.json) or their own database table (e.g. newspal_articles). NEVER store them in the same place as existing content.

2. The listing page must MERGE both sources: load existing articles from wherever they currently live AND load News Pal articles from newspal storage, combine them into one array, sort by date, and render.

3. The detail/article page must check BOTH sources when looking up an article by slug.

4. The /newspal/receive POST endpoint must ONLY write to the separate newspal storage — never touch existing content storage.

My existing articles are gone from the listing page. Please restore them by fixing the code to read from both sources.`); showNotification({ type: 'success', title: 'Copied', message: 'Fix prompt copied', duration: 2000 }) }} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Copy className="w-2.5 h-2.5" /> Copy fix prompt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {pushSuccess && (
                      <div className="flex items-center gap-2 mt-1 ml-7">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-700">Done! Save settings and articles will be pushed automatically.</span>
                      </div>
                    )}
                    <div className="ml-7 mt-1 p-2.5 bg-orange-100/50 rounded-lg">
                      <p className="text-[11px] text-orange-700">Articles will appear at <strong>{automation.site_url || 'your-site/news'}</strong> after the next pipeline run. Individual articles at <strong>{automation.site_url ? automation.site_url.replace(/\/$/, '') : '/news'}/article-slug</strong>.</p>
                    </div>
                  </div>
                </div>
              )}
              {expandedGuide === 'framer' && (
                <div className="ml-7 mt-3 p-4 bg-violet-50/50 rounded-lg border border-violet-100">
                  <p className="text-xs text-slate-600 mb-3">News Pal publishes articles <strong>directly to your Framer CMS</strong> — they appear as native CMS items in your collection, matching your existing blog design.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700 mb-1.5">Create a CMS API token</p>
                        <p className="mt-0.5">Go to <strong>Framer → Site Settings → CMS API</strong> and create a new API token. Give it <strong>Read & Write</strong> access to your blog/articles collection.</p>
                        <input
                          type="password"
                          value={automation.site_api_key || ''}
                          onChange={e => update('site_api_key', e.target.value)}
                          onBlur={() => save({ site_api_key: automation.site_api_key }, true)}
                          placeholder="Paste your Framer CMS API token"
                          className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-300"
                        />
                        {automation.site_api_key && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>API token saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Enter your Framer site URL</p>
                        <p className="mt-0.5">The published URL of your Framer site (e.g. <code className="bg-violet-100 px-1 rounded">https://yoursite.framer.website</code> or your custom domain).</p>
                        <input
                          type="url"
                          value={automation.site_url || ''}
                          onChange={e => update('site_url', e.target.value)}
                          onBlur={() => save({ site_url: automation.site_url }, true)}
                          placeholder="https://yoursite.com"
                          className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-300"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Enter your CMS collection slug</p>
                        <p className="mt-0.5">The slug of the CMS collection where articles should be published (e.g. <code className="bg-violet-100 px-1 rounded">articles</code> or <code className="bg-violet-100 px-1 rounded">blog</code>).</p>
                        <input
                          type="text"
                          value={automation.framer_collection || ''}
                          onChange={e => update('framer_collection', e.target.value)}
                          onBlur={() => save({ framer_collection: automation.framer_collection }, true)}
                          placeholder="articles"
                          className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-300"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">4</div>
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Test the connection</p>
                        <p className="mb-2">Make sure your API token and collection slug are correct, then send a test article.</p>
                        <button
                          onClick={async () => {
                            if (!automation.site_api_key || !automation.framer_collection) {
                              showNotification({ type: 'error', title: 'Missing info', message: 'Enter your API token and collection slug first' })
                              return
                            }
                            setPushingTest(true)
                            try {
                              const res = await fetch('/api/framer/test-push', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  api_token: automation.site_api_key,
                                  collection_slug: automation.framer_collection,
                                }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                setPushSuccess(true)
                                showNotification({ type: 'success', title: 'Connected', message: 'Test article published to your Framer CMS', duration: 4000 })
                              } else {
                                showNotification({ type: 'error', title: 'Connection failed', message: data.error || 'Could not reach Framer CMS' })
                              }
                            } catch {
                              showNotification({ type: 'error', title: 'Error', message: 'Could not test Framer connection' })
                            } finally {
                              setPushingTest(false)
                            }
                          }}
                          disabled={pushingTest || !automation.site_api_key || !automation.framer_collection}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-40"
                        >
                          {pushingTest ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending test article...</> : 'Send test article'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {expandedGuide === 'hubspot' && (
                <div className="ml-7 mt-3 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                  <p className="text-xs text-slate-600 mb-3">News Pal publishes articles <strong>directly as native HubSpot blog posts</strong> — no code needed on your website. Just set up a Private App token and you're good to go.</p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Create a HubSpot Private App</p>
                        <p className="mt-0.5">Go to <strong>HubSpot → Settings → Integrations → Private Apps → Create a private app</strong>. Give it a name like "News Pal".</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                      <div className="text-xs text-slate-600">
                        <p className="font-medium text-slate-700">Set the required scope</p>
                        <p className="mt-0.5">Go to the <strong>Scopes</strong> tab and add: <code className="bg-orange-100 px-1 rounded">cms.blogs.posts</code> (write access). Click <strong>Create app</strong>.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {automation.site_api_key ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Paste your Access Token below</p>
                        <p className="mb-2">Copy the token HubSpot shows after creating the app and paste it in the field below.</p>
                        <input
                          type="password"
                          value={automation.site_api_key || ''}
                          onChange={e => update('site_api_key', e.target.value)}
                          placeholder="pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-orange-400"
                        />
                        {automation.site_api_key && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Token saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {automation.site_api_key ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">4</div>
                      )}
                      <div className="text-xs text-slate-600 flex-1">
                        <p className="font-medium text-slate-700 mb-1.5">Test the connection</p>
                        <button
                          onClick={async () => {
                            if (!automation.site_api_key) {
                              showNotification({ type: 'error', title: 'No token', message: 'Please enter your HubSpot Access Token first' })
                              return
                            }
                            setTestingConnection(true)
                            try {
                              const res = await fetch('/api/hubspot/test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ access_token: automation.site_api_key }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                showNotification({ type: 'success', title: 'Connection successful', message: data.message, duration: 4000 })
                              } else {
                                showNotification({ type: 'error', title: 'Connection failed', message: data.message })
                              }
                            } catch {
                              showNotification({ type: 'error', title: 'Error', message: 'Could not test the connection' })
                            } finally {
                              setTestingConnection(false)
                            }
                          }}
                          disabled={testingConnection || !automation.site_api_key}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                          {testingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Test connection
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-7">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">Done! Save settings and articles will be published automatically as HubSpot blog posts.</span>
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
            {expandedGuide !== 'replit' && expandedGuide !== 'hubspot' && expandedGuide !== 'wordpress' && (
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
          </div>}
        </div>

        {/* Save bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-3">
          {autoSaving && <span className="text-xs text-slate-400">Saving...</span>}
          <button
            onClick={async () => {
              // Auto-enable if not yet active
              if (!automation.enabled) {
                setAutomation(prev => prev ? { ...prev, enabled: true } : prev)
                await save({ enabled: true }, true)
              } else {
                await save(undefined, true)
              }
              window.scrollTo({ top: 0, behavior: 'smooth' })
              setRunningPipeline(true)
              try {
                const res = await fetch('/api/cron/auto-pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true, fetchOnly: true }) })
                const data = await res.json()
                if (!res.ok) throw new Error(data.details || data.error || 'Unknown error')
                const result = data.automations?.find((a: any) => a.automation_id === id)
                if (result?.rewritten > 0 || result?.pending > 0) {
                  const parts: string[] = []
                  if (result.rewritten > 0) parts.push(`${result.rewritten} scheduled`)
                  if (result.pending > 0) parts.push(`${result.pending} in pipeline`)
                  showNotification({ type: 'success', title: 'Articles fetched', message: parts.join(', '), duration: 4000 })
                } else {
                  showNotification({ type: 'warning', title: 'No articles found', message: result?.message || 'Try adding more feeds or broader keywords', duration: 4000 })
                }
                loadArticles()
              } catch (err: any) {
                showNotification({ type: 'error', title: 'Pipeline failed', message: err.message || 'Unknown error' })
              } finally {
                setRunningPipeline(false)
              }
            }}
            disabled={saving || runningPipeline}
            className="inline-flex items-center gap-2 px-6 py-2 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {runningPipeline ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Fetching...</> : 'Save & Fetch Articles'}
          </button>
          {automation.enabled && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Automation is active
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
