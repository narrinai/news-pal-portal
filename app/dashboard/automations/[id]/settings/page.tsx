'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Info, Plus, Trash2 } from 'lucide-react'

interface UrlRule {
  keyword: string
  url: string
  label: string
}

interface InternalLink {
  topic: string
  url: string
}

interface AiSettings {
  // Feature toggles (what's in the default rewrite)
  include_faq: boolean
  include_images: boolean
  include_charts: boolean
  include_header_image: boolean
  include_sources: boolean
  include_quotes: boolean
  // SEO enhancements
  internal_links: string       // auto-generated prompt text from internal_link_rules
  internal_link_rules: InternalLink[]  // structured topic → URL pairs
  max_internal_links: number   // max internal links per article
  url_rules: UrlRule[]         // keyword → always link to URL
  max_url_rules: number        // max keyword→url links per article
  custom_instructions: string  // free-form extra prompt instructions
}

const defaultSettings: AiSettings = {
  include_faq: true,
  include_images: true,
  include_charts: true,
  include_header_image: true,
  include_sources: true,
  include_quotes: true,
  internal_links: '',
  internal_link_rules: [],
  max_internal_links: 2,
  url_rules: [],
  max_url_rules: 2,
  custom_instructions: '',
}

// Parse legacy internal_links string into structured rules
function parseInternalLinks(text: string): InternalLink[] {
  if (!text) return []
  return text.split('\n').filter(Boolean).map(line => {
    // Try patterns like "When mentioning X, link to Y" or "X → Y" or "X, Y" or "X\tY"
    const arrowMatch = line.match(/^(.+?)\s*[→➜\->]+\s*(.+)$/)
    if (arrowMatch) return { topic: arrowMatch[1].trim(), url: arrowMatch[2].trim() }
    const whenMatch = line.match(/[Ww]hen\s+(?:mentioning|discussing|referencing|talking about)\s+(.+?),?\s+link\s+to\s+(.+)/i)
    if (whenMatch) return { topic: whenMatch[1].trim(), url: whenMatch[2].trim() }
    const tabMatch = line.split('\t')
    if (tabMatch.length >= 2) return { topic: tabMatch[0].trim(), url: tabMatch[1].trim() }
    return null
  }).filter((r): r is InternalLink => r !== null && r.topic !== '' && r.url !== '')
}

// Generate prompt text from structured rules
function generateInternalLinksText(rules: InternalLink[]): string {
  return rules.filter(r => r.topic && r.url).map(r => `When mentioning ${r.topic}, link to ${r.url}`).join('\n')
}

const DEFAULT_FEATURES = [
  {
    key: 'include_faq',
    label: 'FAQ section',
    description: '5 frequently asked questions automatically generated at the bottom of each article — great for featured snippets in Google.',
  },
  {
    key: 'include_images',
    label: 'Inline images',
    description: 'At least 3 relevant Unsplash images embedded in the article body with captions.',
  },
  {
    key: 'include_header_image',
    label: 'Header image (Pexels)',
    description: 'A full-width header image sourced from Pexels, matched to the article topic.',
  },
  {
    key: 'include_charts',
    label: 'Charts & data tables',
    description: 'Bar charts, stat blocks, and comparison tables generated inline to support key claims.',
  },
  {
    key: 'include_sources',
    label: 'Sources section',
    description: 'A sources list at the bottom with 3–5 authoritative links woven into the text.',
  },
  {
    key: 'include_quotes',
    label: 'Expert quotes',
    description: 'One or two generated quotes attributed to people mentioned in the article.',
  },
]

export default function AutomationSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  if (!id) return null

  const [automationName, setAutomationName] = useState('')
  const [settings, setSettings] = useState<AiSettings>(defaultSettings)
  const [extraContext, setExtraContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showUrlPasteModal, setShowUrlPasteModal] = useState(false)
  const [urlPasteText, setUrlPasteText] = useState('')

  useEffect(() => {
    fetch(`/api/automations/${id}`)
      .then(r => r.json())
      .then(data => {
        setAutomationName(data.name || '')
        setExtraContext(data.extra_context || '')
        if (data.ai_settings) {
          try {
            const parsed = JSON.parse(data.ai_settings)
            const merged = { ...defaultSettings, ...parsed }
            // Migrate legacy internal_links text to structured rules
            if (merged.internal_links && (!merged.internal_link_rules || merged.internal_link_rules.length === 0)) {
              merged.internal_link_rules = parseInternalLinks(merged.internal_links)
            }
            setSettings(merged)
          } catch {}
        }
      })
  }, [id])

  const toggle = (key: keyof AiSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }


  const removeUrlRule = (i: number) => {
    setSettings(s => ({ ...s, url_rules: s.url_rules.filter((_, idx) => idx !== i) }))
  }

  const save = useCallback(async () => {
    setSaving(true)
    try {
      // Auto-generate internal_links prompt text from structured rules
      const settingsToSave = {
        ...settings,
        internal_links: generateInternalLinksText(settings.internal_link_rules),
      }
      await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_settings: JSON.stringify(settingsToSave),
          extra_context: extraContext,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }, [id, settings, extraContext])

  // Autosave with debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoad = useRef(true)
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false
      return
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => { save() }, 1500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [settings, extraContext, save])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">AI Settings</p>
            <h1 className="text-xl font-bold text-slate-800">{automationName || 'Automation'}</h1>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
          </button>
        </div>

        {/* Default features */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Default rewrite features</h2>
          <p className="text-sm text-slate-500 mb-5">These are included in every article by default. Toggle off to disable.</p>
          <div className="space-y-4">
            {DEFAULT_FEATURES.map(f => {
              const enabled = settings[f.key as keyof AiSettings] as boolean
              return (
                <div key={f.key} className="flex items-start gap-4">
                  <button
                    onClick={() => toggle(f.key as keyof AiSettings)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 mt-0.5 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    role="switch"
                    aria-checked={enabled}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Internal linking */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-2 mb-1">
            <h2 className="text-base font-semibold text-slate-800">Internal linking strategy</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mt-0.5">SEO</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Tell the AI which topics should link to pages on your site. The AI will weave these links naturally into the article text.
          </p>

          {/* Link rules table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-slate-500 w-[45%]">Topic / keyword</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500 w-[45%]">Link to</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(settings.internal_link_rules.length > 0 ? settings.internal_link_rules : [{ topic: '', url: '' }]).map((rule, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">
                      <input
                        value={rule.topic}
                        onChange={e => {
                          if (settings.internal_link_rules.length === 0) {
                            setSettings(s => ({ ...s, internal_link_rules: [{ topic: e.target.value, url: '' }] }))
                          } else {
                            setSettings(s => ({ ...s, internal_link_rules: s.internal_link_rules.map((r, idx) => idx === i ? { ...r, topic: e.target.value } : r) }))
                          }
                        }}
                        className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 px-0"
                        placeholder="e.g. email marketing"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={rule.url}
                        onChange={e => {
                          if (settings.internal_link_rules.length === 0) {
                            setSettings(s => ({ ...s, internal_link_rules: [{ topic: '', url: e.target.value }] }))
                          } else {
                            setSettings(s => ({ ...s, internal_link_rules: s.internal_link_rules.map((r, idx) => idx === i ? { ...r, url: e.target.value } : r) }))
                          }
                        }}
                        className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 px-0 font-mono text-indigo-600"
                        placeholder="/page-path or full URL"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {settings.internal_link_rules.length > 0 && (
                        <button onClick={() => setSettings(s => ({ ...s, internal_link_rules: s.internal_link_rules.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row + paste buttons */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setSettings(s => ({ ...s, internal_link_rules: [...s.internal_link_rules, { topic: '', url: '' }] }))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus size={13} /> Add link
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Paste from spreadsheet
            </button>
          </div>

          {/* Paste modal */}
          {showPasteModal && (
            <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Paste rows from a spreadsheet (tab-separated) or one per line as <code className="bg-slate-100 px-1 rounded">topic, url</code></p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={4}
                placeholder={"email marketing\t/email-marketing-tools\nSEO tools\t/seo-software\nAI writing\t/ai-content-tools"}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const parsed = pasteText.split('\n').filter(Boolean).map(line => {
                      const parts = line.includes('\t') ? line.split('\t') : line.split(',')
                      if (parts.length >= 2) return { topic: parts[0].trim(), url: parts[1].trim() }
                      return null
                    }).filter((r): r is InternalLink => r !== null && r.topic !== '' && r.url !== '')
                    if (parsed.length > 0) {
                      setSettings(s => ({ ...s, internal_link_rules: [...s.internal_link_rules, ...parsed] }))
                    }
                    setPasteText('')
                    setShowPasteModal(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  {pasteText.trim() ? `Add ${pasteText.split('\n').filter(Boolean).length} rows` : 'Add rows'}
                </button>
                <button
                  onClick={() => { setPasteText(''); setShowPasteModal(false) }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              Max total links per article
              <select
                value={settings.max_internal_links}
                onChange={e => setSettings(s => ({ ...s, max_internal_links: Number(e.target.value) }))}
                className="border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {[1,2,3,4,5,8,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* URL rules */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-2 mb-1">
            <h2 className="text-base font-semibold text-slate-800">Keyword → URL rules</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mt-0.5">SEO</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            When a specific term is mentioned, always link it to a specific URL. Great for product pages, partner links, or key landing pages.
          </p>

          <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-slate-500 w-[35%]">Keyword</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500 w-[35%]">URL</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500 w-[22%]">Label (optional)</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(settings.url_rules.length > 0 ? settings.url_rules : [{ keyword: '', url: '', label: '' }]).map((rule, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">
                      <input
                        value={rule.keyword}
                        onChange={e => {
                          if (settings.url_rules.length === 0) {
                            setSettings(s => ({ ...s, url_rules: [{ keyword: e.target.value, url: '', label: '' }] }))
                          } else {
                            setSettings(s => ({ ...s, url_rules: s.url_rules.map((r, idx) => idx === i ? { ...r, keyword: e.target.value } : r) }))
                          }
                        }}
                        className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 px-0"
                        placeholder='e.g. "Mailchimp"'
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={rule.url}
                        onChange={e => {
                          if (settings.url_rules.length === 0) {
                            setSettings(s => ({ ...s, url_rules: [{ keyword: '', url: e.target.value, label: '' }] }))
                          } else {
                            setSettings(s => ({ ...s, url_rules: s.url_rules.map((r, idx) => idx === i ? { ...r, url: e.target.value } : r) }))
                          }
                        }}
                        className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 px-0 font-mono text-indigo-600"
                        placeholder="/email-tools"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={rule.label}
                        onChange={e => {
                          if (settings.url_rules.length === 0) {
                            setSettings(s => ({ ...s, url_rules: [{ keyword: '', url: '', label: e.target.value }] }))
                          } else {
                            setSettings(s => ({ ...s, url_rules: s.url_rules.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r) }))
                          }
                        }}
                        className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 px-0 text-slate-400"
                        placeholder='"our review"'
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {settings.url_rules.length > 0 && (
                        <button onClick={() => removeUrlRule(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettings(s => ({ ...s, url_rules: [...s.url_rules, { keyword: '', url: '', label: '' }] }))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Plus size={13} /> Add rule
              </button>
              <button
                onClick={() => setShowUrlPasteModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Paste from spreadsheet
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Max total per article
              <select
                value={settings.max_url_rules}
                onChange={e => setSettings(s => ({ ...s, max_url_rules: Number(e.target.value) }))}
                className="border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          {/* URL rules paste modal */}
          {showUrlPasteModal && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Paste rows from a spreadsheet (tab-separated) or one per line as <code className="bg-slate-100 px-1 rounded">keyword, url</code> or <code className="bg-slate-100 px-1 rounded">keyword, url, label</code></p>
              <textarea
                value={urlPasteText}
                onChange={e => setUrlPasteText(e.target.value)}
                rows={4}
                placeholder={"Mailchimp\t/email-tools\tour review\nHubSpot\t/crm-tools\nSalesforce\t/crm-tools\tcompare"}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const parsed = urlPasteText.split('\n').filter(Boolean).map(line => {
                      const parts = line.includes('\t') ? line.split('\t') : line.split(',')
                      if (parts.length >= 2) return { keyword: parts[0].trim(), url: parts[1].trim(), label: (parts[2] || '').trim() }
                      return null
                    }).filter((r): r is UrlRule => r !== null && r.keyword !== '' && r.url !== '')
                    if (parsed.length > 0) {
                      setSettings(s => ({ ...s, url_rules: [...s.url_rules, ...parsed] }))
                    }
                    setUrlPasteText('')
                    setShowUrlPasteModal(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  {urlPasteText.trim() ? `Add ${urlPasteText.split('\n').filter(Boolean).length} rules` : 'Add rules'}
                </button>
                <button
                  onClick={() => { setUrlPasteText(''); setShowUrlPasteModal(false) }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Custom AI instructions */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Custom AI instructions</h2>
          <p className="text-sm text-slate-500 mb-4">
            Free-form instructions passed to the AI for every article. Use this for tone, brand voice, topics to avoid, or anything specific to your site.
          </p>
          <textarea
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            rows={6}
            placeholder={`Examples:\n- Always write in a friendly, approachable tone\n- Avoid mentioning competitor names\n- Focus on practical tips for small business owners\n- End every article with a call-to-action to sign up for our newsletter`}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </section>

        {/* What's always in the prompt (read-only info) */}
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-600">What's always in the rewrite prompt</h2>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li>✓ Rewrites in your selected language (NL / EN / DE)</li>
            <li>✓ Adapts to your selected style (News, Professional, Technical, Engaging)</li>
            <li>✓ Scales to your selected length (Short → Longform)</li>
            <li>✓ Preserves the core message of the original article</li>
            <li>✓ Never includes a publication date (CMS handles that)</li>
            <li>✓ Adds context relevant to your target audience (if set)</li>
            <li>✓ Weaves source links naturally into the text</li>
            <li>✓ Uses journalistic structure with clear H2 sections</li>
          </ul>
        </section>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
