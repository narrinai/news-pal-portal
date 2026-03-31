'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NewsArticle } from '../../../../lib/airtable'
import { RewriteOptions } from '../../../../lib/ai-rewriter'
import { useNotifications } from '../../../../components/NotificationSystem'
import {
  ArrowLeft, ExternalLink, Copy, Check, RefreshCw, Code, FileText, PenLine, Send
} from 'lucide-react'

interface RewritePageProps {
  params: { id: string }
}

export default function RewritePage({ params }: RewritePageProps) {
  const { showNotification } = useNotifications()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [automation, setAutomation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rewriting, setRewriting] = useState(false)
  const [rewritten, setRewritten] = useState<{
    title: string
    content: string
    content_html: string
  } | null>(null)
  const [options, setOptions] = useState<RewriteOptions>({
    style: 'news',
    length: 'medium',
    language: 'nl',
    tone: 'informative'
  })
  const [customInstructions, setCustomInstructions] = useState('')
  const [extraInstructions, setExtraInstructions] = useState('')
  const [showHtml, setShowHtml] = useState(false)
  const [tooltips, setTooltips] = useState<{[key: string]: boolean}>({})
  const router = useRouter()

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    fetchArticle()
  }, [params.id])

  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles`)
      if (response.ok) {
        const articles = await response.json()
        const foundArticle = articles.find((a: NewsArticle) => a.id === params.id)
        setArticle(foundArticle)
        if (foundArticle?.content_rewritten) {
          setRewritten({
            title: foundArticle.title,
            content: foundArticle.content_rewritten,
            content_html: foundArticle.content_html || ''
          })
        }

        // Load automation settings to use as defaults
        if (foundArticle?.automation_id) {
          try {
            const autoRes = await fetch(`/api/automations/${foundArticle.automation_id}`)
            if (autoRes.ok) {
              const autoData = await autoRes.json()
              setAutomation(autoData)
              setOptions({
                style: (autoData.style || 'news') as any,
                length: (autoData.length || 'medium') as any,
                language: (autoData.language || 'nl') as any,
                tone: 'informative'
              })
              setCustomInstructions(autoData.extra_context || '')
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRewrite = async () => {
    setRewriting(true)
    const startContent = article?.content_html || ''
    showNotification({ type: 'info', title: 'Rewriting...', message: 'Article is being rewritten by AI. This may take up to a minute.', duration: 10000 })

    // Fire the request — don't await it, let it run server-side
    fetch(`/api/articles/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: params.id,
        options,
        customInstructions: [extraInstructions, customInstructions].filter(Boolean).join('\n\n') || undefined
      })
    }).catch(() => {}) // Ignore network errors — we poll instead

    // Poll for completion (every 5s, max 2 min)
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000))
      try {
        const checkRes = await fetch(`/api/articles/${params.id}`)
        const checkData = await checkRes.json()
        if (checkData.content_html && checkData.content_html !== startContent) {
          setRewritten({
            title: checkData.title,
            content: checkData.content_rewritten || checkData.content_html,
            content_html: checkData.content_html,
          })
          setArticle(prev => prev ? { ...prev, ...checkData } : prev)
          showNotification({ type: 'success', title: 'Article rewritten', message: 'The article has been successfully rewritten', duration: 4000 })
          setRewriting(false)
          return
        }
      } catch {}
    }
    showNotification({ type: 'error', title: 'Rewrite timeout', message: 'Rewrite is taking longer than expected. Check back in a minute.' })
    setRewriting(false)
  }

  const copyToClipboard = async (text: string, tooltipId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setTooltips(prev => ({ ...prev, [tooltipId]: true }))
      setTimeout(() => { setTooltips(prev => ({ ...prev, [tooltipId]: false })) }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const saveEdits = async () => {
    if (!rewritten) return
    setSavingEdits(true)
    try {
      const res = await fetch(`/api/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rewritten.title,
          content_rewritten: rewritten.content,
          content_html: rewritten.content_html,
        }),
      })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Saved', message: 'Changes saved successfully' })
        setEditingTitle(false)
        setEditingContent(false)
      } else {
        showNotification({ type: 'error', title: 'Error', message: 'Could not save changes' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not save changes' })
    } finally {
      setSavingEdits(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const updates: any = {
        status: 'published',
        ...(article?.automation_id ? { automation_id: article.automation_id } : {}),
      }
      if (rewritten) {
        updates.title = rewritten.title
        updates.content_rewritten = rewritten.content
        updates.content_html = rewritten.content_html
      }
      const res = await fetch(`/api/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        showNotification({ type: 'success', title: 'Published', message: 'Article published successfully', duration: 3000 })
        // Push to connected site if automation has a site configured
        if (article?.automation_id) {
          try {
            const pushRes = await fetch('/api/sites/push-articles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ automation_id: article.automation_id, article_ids: [params.id] }),
            })
            const pushData = await pushRes.json()
            if (pushData.success && pushData.pushed > 0) {
              showNotification({ type: 'success', title: 'Pushed to site', message: `Article pushed to your site`, duration: 3000 })
            }
          } catch { /* silent — push is best-effort */ }
          router.push(`/dashboard/automations/${article.automation_id}`)
        } else {
          router.back()
        }
      } else {
        showNotification({ type: 'error', title: 'Error', message: 'Could not publish article' })
      }
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Could not publish article' })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-500">Loading article...</p>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-slate-500">Article not found</p>
          <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Rewrite Article</h1>
          {automation && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">{automation.name}</span>
          )}
        </div>
      </div>

      {/* Original Article — collapsible */}
      <details className="bg-white rounded-lg border border-slate-200 mb-6">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
          <FileText className="w-4 h-4" />
          Original: {article.title}
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-500 hover:text-indigo-700" onClick={e => e.stopPropagation()}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </summary>
        <div className="px-6 pb-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500 mb-2">Source: {article.source}</p>
          <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
            {article.originalContent || article.description}
          </p>
        </div>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Rewrite Options & Result */}
        <div className="space-y-6">
          {/* Options */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Rewrite Settings</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Style</label>
                <select
                  value={options.style}
                  onChange={(e) => setOptions({...options, style: e.target.value as any})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="news">News</option>
                  <option value="professional">Professional</option>
                  <option value="engaging">Engaging</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Length</label>
                <select
                  value={options.length}
                  onChange={(e) => setOptions({...options, length: e.target.value as any})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                  <option value="extra-long">Extra Long</option>
                  <option value="longform">Longform</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Language</label>
                <select
                  value={options.language}
                  onChange={(e) => setOptions({...options, language: e.target.value as any})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="nl">Dutch</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Extra instructions - quick one-off tweaks */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">One-off instructions <span className="font-normal text-slate-400">(only for this rewrite)</span></label>
              <textarea
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. 'Focus on the pricing aspect' or 'Make it shorter'"
              />
            </div>

            {/* Extra AI Instructions loaded from automation but hidden — still sent with rewrite */}

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRewrite}
                disabled={rewriting || publishing}
                className="flex-1 inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {rewriting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 mr-2" />
                    {rewritten ? 'Rewrite Again' : 'Rewrite Article'}
                  </>
                )}
              </button>
              {rewritten && (
                <button
                  onClick={handlePublish}
                  disabled={publishing || rewriting}
                  className="inline-flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {publishing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish
                    </>
                  )}
                </button>
              )}
            </div>

            {rewriting && (
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-sm text-indigo-700">AI is rewriting the article. This usually takes about 1 minute.</p>
                <div className="mt-2 bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full progress-bar"></div>
                </div>
              </div>
            )}

            {rewritten && !rewriting && (
              <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700">Article rewritten. Review the result below, then publish or rewrite again.</p>
              </div>
            )}

            {rewritten && article.automation_id && (
              <button
                onClick={() => router.push(`/dashboard/automations/${article.automation_id}`)}
                className="mt-3 w-full inline-flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Automation
              </button>
            )}
          </div>

          {/* Rewritten Result */}
          {rewritten && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-900">Rewritten Article</h2>
                <button
                  onClick={() => setShowHtml(!showHtml)}
                  className="inline-flex items-center text-xs border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors text-slate-500"
                >
                  {showHtml ? <FileText className="w-3 h-3 mr-1" /> : <Code className="w-3 h-3 mr-1" />}
                  {showHtml ? 'Text' : 'HTML'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  {editingTitle ? (
                    <input
                      type="text"
                      value={rewritten.title}
                      onChange={(e) => setRewritten({ ...rewritten, title: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditingTitle(false) }}
                      autoFocus
                      className="w-full font-medium text-slate-900 mb-2 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <h3
                      className="font-medium text-slate-900 mb-2 cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => setEditingTitle(true)}
                      title="Click to edit"
                    >
                      {rewritten.title}
                    </h3>
                  )}
                  <div className="relative inline-block">
                    <button
                      onClick={() => copyToClipboard(rewritten.title, 'title')}
                      className="inline-flex items-center text-xs border border-slate-200 text-slate-500 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                    >
                      {tooltips.title ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
                      {tooltips.title ? 'Copied!' : 'Copy title'}
                    </button>
                  </div>
                </div>

                <div>
                  {showHtml ? (
                    <pre className="text-sm bg-slate-50 border border-slate-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-slate-600">
                      {rewritten.content_html}
                    </pre>
                  ) : editingContent ? (
                    <textarea
                      value={rewritten.content}
                      onChange={(e) => setRewritten({ ...rewritten, content: e.target.value })}
                      rows={12}
                      className="w-full text-slate-600 text-sm leading-relaxed border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <div
                      className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => setEditingContent(true)}
                      title="Click to edit"
                    >
                      {rewritten.content}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {(editingTitle || editingContent) && (
                      <button
                        onClick={saveEdits}
                        disabled={savingEdits}
                        className="inline-flex items-center text-sm bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                      >
                        {savingEdits ? (
                          <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                        ) : (
                          <><Check className="w-3.5 h-3.5 mr-1.5" />Save changes</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(showHtml ? rewritten.content_html : rewritten.content, 'content')}
                      className="inline-flex items-center text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {tooltips.content ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                      {tooltips.content ? 'Copied!' : `Copy ${showHtml ? 'HTML' : 'text'}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
