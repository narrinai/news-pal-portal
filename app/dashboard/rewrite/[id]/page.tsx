'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NewsArticle } from '../../../../lib/airtable'
import { RewriteOptions } from '../../../../lib/ai-rewriter'
import { useNotifications } from '../../../../components/NotificationSystem'
import {
  ArrowLeft, ExternalLink, Copy, Check, Send, RefreshCw, Code, FileText, PenLine
} from 'lucide-react'

interface RewritePageProps {
  params: { id: string }
}

export default function RewritePage({ params }: RewritePageProps) {
  const { showNotification, showConfirm } = useNotifications()
  const [article, setArticle] = useState<NewsArticle | null>(null)
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
  const [settings, setSettings] = useState<any>(null)
  const [showHtml, setShowHtml] = useState(false)
  const [tooltips, setTooltips] = useState<{[key: string]: boolean}>({})
  const [publishing, setPublishing] = useState(false)
  const [selectedWordPressSite, setSelectedWordPressSite] = useState('marketingtoolz')
  const router = useRouter()

  const wordPressSites = [
    { id: 'marketingtoolz', name: 'Marketingtoolz.nl', url: 'https://www.marketingtoolz.nl' },
    { id: 'cybertijger', name: 'CyberTijger.nl', url: 'https://cybertijger.nl' }
  ]

  useEffect(() => {
    fetchArticle()
    loadSettings()
  }, [params.id])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setCustomInstructions(data.rewriteInstructions?.general || '')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  useEffect(() => {
    if (settings?.rewriteInstructions) {
      const styleInstructions = settings.rewriteInstructions[options.style] || settings.rewriteInstructions.general
      setCustomInstructions(styleInstructions)
    }
  }, [options.style, settings])

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
          if (foundArticle.status === 'rewritten') {
            setShowHtml(false)
          }
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
    try {
      const response = await fetch(`/api/articles/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          options,
          customInstructions: customInstructions || undefined
        })
      })
      if (response.ok) {
        const result = await response.json()
        setRewritten(result.rewritten)
        showNotification({ type: 'success', title: 'Article rewritten', message: 'The article has been successfully rewritten', duration: 4000 })
      } else {
        showNotification({ type: 'error', title: 'Rewrite failed', message: 'An error occurred while rewriting the article' })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not rewrite article' })
    } finally {
      setRewriting(false)
    }
  }

  const publishToWordPress = async () => {
    if (!rewritten) {
      showNotification({ type: 'warning', title: 'No content', message: 'Please rewrite the article first' })
      return
    }
    setPublishing(true)
    try {
      const selectedSite = wordPressSites.find(site => site.id === selectedWordPressSite)
      const response = await fetch('/api/wordpress/publish-with-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: params.id,
          title: rewritten.title,
          content_html: rewritten.content_html,
          wordPressSite: selectedSite
        })
      })
      if (response.ok) {
        const result = await response.json()
        showNotification({ type: 'success', title: 'Published!', message: 'Article saved as draft', duration: 5000 })
        if (result.wordpress?.editUrl) {
          setTimeout(() => {
            showConfirm({
              title: 'Article published!',
              message: 'Would you like to open the WordPress editor to review it?',
              confirmText: 'Open Editor',
              cancelText: 'Stay Here'
            }).then((confirmed) => {
              if (confirmed) window.open(result.wordpress.editUrl, '_blank')
            })
          }, 1000)
        }
      } else {
        const error = await response.json()
        showNotification({ type: 'error', title: 'Publish failed', message: error.details || `Server error: ${response.status}` })
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Network error', message: 'Could not connect to WordPress' })
    } finally {
      setPublishing(false)
    }
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
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
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
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Articles
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Rewrite</h1>
          {article.status === 'rewritten' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-200 text-emerald-700">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
              Completed
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Article */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Original Article</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900 mb-2">{article.title}</h3>
                <p className="text-sm text-slate-500 mb-3">Source: {article.source}</p>
                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                  {article.originalContent || article.description}
                </p>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View original article
              </a>
            </div>
          </div>

          {/* Rewrite Options & Result */}
          <div className="space-y-6">
            {/* Options */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Rewrite Options</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Style</label>
                  <select
                    value={options.style}
                    onChange={(e) => setOptions({...options, style: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="news">News</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Length</label>
                  <select
                    value={options.length}
                    onChange={(e) => setOptions({...options, length: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="short">Short (200-300 words)</option>
                    <option value="medium">Medium (400-600 words)</option>
                    <option value="long">Long (700-1000 words)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Language</label>
                  <select
                    value={options.language}
                    onChange={(e) => setOptions({...options, language: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">AI Instructions</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Custom instructions for the AI..."
                />
              </div>

              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="mt-4 w-full inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {rewriting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 mr-2" />
                    {article.status === 'rewritten' ? 'Rewrite Again' : 'Rewrite Article'}
                  </>
                )}
              </button>

              {rewriting && (
                <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-sm text-indigo-700">AI is rewriting the article. This can take 10-30 seconds.</p>
                  <div className="mt-2 bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full progress-bar"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Rewritten Result */}
            {rewritten && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-slate-900">Rewritten Article</h2>
                    {article.status === 'rewritten' && (
                      <span className="text-xs text-slate-400 border border-slate-200 px-2 py-0.5 rounded">Existing</span>
                    )}
                  </div>
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
                    <h3 className="font-medium text-slate-900 mb-2">{rewritten.title}</h3>
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
                    ) : (
                      <div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                        {rewritten.content}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(showHtml ? rewritten.content_html : rewritten.content, 'content')}
                        className="inline-flex items-center text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors"
                      >
                        {tooltips.content ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                        {tooltips.content ? 'Copied!' : `Copy ${showHtml ? 'HTML' : 'text'}`}
                      </button>

                      <select
                        value={selectedWordPressSite}
                        onChange={(e) => setSelectedWordPressSite(e.target.value)}
                        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {wordPressSites.map(site => (
                          <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={publishToWordPress}
                        disabled={publishing}
                        className="inline-flex items-center text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                      >
                        {publishing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Publish to {wordPressSites.find(s => s.id === selectedWordPressSite)?.name}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
