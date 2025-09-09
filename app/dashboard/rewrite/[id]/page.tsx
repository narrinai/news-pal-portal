'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NewsArticle } from '../../../../lib/airtable'
import { RewriteOptions } from '../../../../lib/ai-rewriter'

interface RewritePageProps {
  params: { id: string }
}

export default function RewritePage({ params }: RewritePageProps) {
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
  const [showHtml, setShowHtml] = useState(false)
  const router = useRouter()

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
        
        // If already rewritten, show the rewritten content
        if (foundArticle?.rewrittenContent) {
          setRewritten({
            title: foundArticle.title,
            content: foundArticle.rewrittenContent,
            wordpressHtml: foundArticle.wordpressHtml || ''
          })
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
        body: JSON.stringify({ id: params.id, options })
      })

      if (response.ok) {
        const result = await response.json()
        setRewritten(result.rewritten)
      } else {
        alert('Fout bij herschrijven van artikel')
      }
    } catch (error) {
      console.error('Error rewriting article:', error)
      alert('Fout bij herschrijven van artikel')
    } finally {
      setRewriting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Gekopieerd naar klembord!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Artikel laden...</p>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Artikel niet gevonden</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary-600 hover:text-primary-700 mb-2"
              >
                ← Terug naar dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Artikel Herschrijven</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Article */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Origineel Artikel</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-2">Bron: {article.source}</p>
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
                Bekijk originele artikel →
              </a>
            </div>
          </div>

          {/* Rewrite Options & Result */}
          <div className="space-y-6">
            {/* Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Herschrijf Opties</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stijl
                  </label>
                  <select
                    value={options.style}
                    onChange={(e) => setOptions({...options, style: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="professional">Professioneel</option>
                    <option value="engaging">Boeiend</option>
                    <option value="technical">Technisch</option>
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

              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {rewriting ? 'Herschrijven...' : 'Herschrijf Artikel'}
              </button>
            </div>

            {/* Rewritten Result */}
            {rewritten && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Herschreven Artikel</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowHtml(!showHtml)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                    >
                      {showHtml ? 'Tekst' : 'HTML'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">{rewritten.title}</h3>
                    <button
                      onClick={() => copyToClipboard(rewritten.title)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Kopieer titel
                    </button>
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
                    <button
                      onClick={() => copyToClipboard(showHtml ? rewritten.wordpressHtml : rewritten.content)}
                      className="mt-2 text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded"
                    >
                      Kopieer {showHtml ? 'HTML' : 'tekst'}
                    </button>
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