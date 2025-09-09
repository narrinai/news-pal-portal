'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NewsArticle } from '../../../../lib/airtable'
import { RewriteOptions } from '../../../../lib/ai-rewriter'
import { useNotifications } from '../../../../components/NotificationSystem'
import Logo from '../../../../components/Logo'

interface RewritePageProps {
  params: { id: string }
}

export default function RewritePage({ params }: RewritePageProps) {
  const { showNotification } = useNotifications()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [rewriting, setRewriting] = useState(false)
  const [rewritten, setRewritten] = useState<{
    title: string
    content: string
    wordpressHtml: string
  } | null>(null)
  const [options, setOptions] = useState<RewriteOptions>({
    style: 'professional',
    length: 'medium',
    language: 'nl',
    tone: 'informative'
  })
  const [customInstructions, setCustomInstructions] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [showHtml, setShowHtml] = useState(false)
  const [tooltips, setTooltips] = useState<{[key: string]: boolean}>({})
  const router = useRouter()

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
        // Set default custom instruction based on style
        setCustomInstructions(data.rewriteInstructions?.general || '')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  // Update custom instructions when style changes
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
        
        // If already rewritten, show the rewritten content
        if (foundArticle?.rewrittenContent) {
          setRewritten({
            title: foundArticle.title,
            content: foundArticle.rewrittenContent,
            wordpressHtml: foundArticle.wordpressHtml || ''
          })
          // For rewritten articles, show the content by default
          if (foundArticle.status === 'rewritten') {
            setShowHtml(false) // Show text version by default for easier reading
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
        showNotification({
          type: 'success',
          title: 'Article rewritten',
          message: 'The article has been successfully rewritten with AI',
          duration: 4000
        })
      } else {
        showNotification({
          type: 'error',
          title: 'Rewrite failed',
          message: 'An error occurred while rewriting the article'
        })
      }
    } catch (error) {
      console.error('Error rewriting article:', error)
      showNotification({
        type: 'error',
        title: 'Network error',
        message: 'Could not rewrite article due to network problems'
      })
    } finally {
      setRewriting(false)
    }
  }

  const copyToClipboard = async (text: string, tooltipId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setTooltips(prev => ({ ...prev, [tooltipId]: true }))
      setTimeout(() => {
        setTooltips(prev => ({ ...prev, [tooltipId]: false }))
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Article not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Logo size="lg" className="mr-4" clickable={true} href="/dashboard" />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to dashboard
              </button>
              {article.status === 'rewritten' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Article */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Original Article</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-2">Source: {article.source}</p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {article.originalContent || article.description}
                </p>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View original article →
              </a>
            </div>
          </div>

          {/* Rewrite Options & Result */}
          <div className="space-y-6">
            {/* Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Rewrite Options</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Style
                  </label>
                  <select
                    value={options.style}
                    onChange={(e) => setOptions({...options, style: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="professional">Professional</option>
                    <option value="engaging">Engaging</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lengte
                  </label>
                  <select
                    value={options.length}
                    onChange={(e) => setOptions({...options, length: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="short">Kort (200-300 woorden)</option>
                    <option value="medium">Gemiddeld (400-600 woorden)</option>
                    <option value="long">Lang (700-1000 woorden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Toon
                  </label>
                  <select
                    value={options.tone}
                    onChange={(e) => setOptions({...options, tone: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="neutral">Neutraal</option>
                    <option value="warning">Waarschuwend</option>
                    <option value="informative">Informatief</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taal
                  </label>
                  <select
                    value={options.language}
                    onChange={(e) => setOptions({...options, language: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">Engels</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Instructies (optioneel aanpassen)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Aangepaste instructies voor de AI..."
                />
              </div>

              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {rewriting ? 'Herschrijven...' : 
                 article.status === 'rewritten' ? 'Opnieuw Herschrijven' : 'Herschrijf Artikel'}
              </button>
            </div>

            {/* Rewritten Result */}
            {rewritten && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Herschreven Artikel</h2>
                    {article.status === 'rewritten' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
                        Bestaande versie
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowHtml(!showHtml)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors duration-200"
                    >
                      {showHtml ? 'Tekst' : 'HTML'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">{rewritten.title}</h3>
                    <div className="relative inline-block">
                      <button
                        onClick={() => copyToClipboard(rewritten.title, 'title')}
                        className="inline-flex items-center text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Kopieer titel
                      </button>
                      {tooltips.title && (
                        <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                          Titel gekopieerd!
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {showHtml ? (
                      <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                        {rewritten.wordpressHtml}
                      </pre>
                    ) : (
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {rewritten.content}
                      </div>
                    )}
                    <div className="relative inline-block mt-2">
                      <button
                        onClick={() => copyToClipboard(showHtml ? rewritten.wordpressHtml : rewritten.content, 'content')}
                        className="inline-flex items-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Kopieer {showHtml ? 'HTML' : 'tekst'}
                      </button>
                      {tooltips.content && (
                        <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                          {showHtml ? 'HTML' : 'Tekst'} gekopieerd!
                        </div>
                      )}
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