'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Info, ToggleLeft, ToggleRight, Plus, Trash2, ExternalLink } from 'lucide-react'

interface UrlRule {
  keyword: string
  url: string
  label: string
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
  internal_links: string       // free text describing internal link strategy
  url_rules: UrlRule[]         // keyword → always link to URL
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
  url_rules: [],
  custom_instructions: '',
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

const SEO_TIPS = [
  {
    title: 'Internal linking',
    description: 'Tell the AI which topics should link to which pages on your site. Example: "When mentioning email marketing, link internally to /email-marketing-tools"',
    field: 'internal_links',
    placeholder: 'When mentioning email marketing, link to /email-marketing-tools\nWhen discussing SEO tools, link to /seo-software\nWhen referencing AI writing tools, link to /ai-content-tools',
  },
]

export default function AutomationSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [automationName, setAutomationName] = useState('')
  const [settings, setSettings] = useState<AiSettings>(defaultSettings)
  const [extraContext, setExtraContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRule, setNewRule] = useState({ keyword: '', url: '', label: '' })

  useEffect(() => {
    fetch(`/api/automations/${id}`)
      .then(r => r.json())
      .then(data => {
        setAutomationName(data.name || '')
        setExtraContext(data.extra_context || '')
        if (data.ai_settings) {
          try {
            const parsed = JSON.parse(data.ai_settings)
            setSettings({ ...defaultSettings, ...parsed })
          } catch {}
        }
      })
  }, [id])

  const toggle = (key: keyof AiSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  const addUrlRule = () => {
    if (!newRule.keyword || !newRule.url) return
    setSettings(s => ({ ...s, url_rules: [...s.url_rules, newRule] }))
    setNewRule({ keyword: '', url: '', label: '' })
  }

  const removeUrlRule = (i: number) => {
    setSettings(s => ({ ...s, url_rules: s.url_rules.filter((_, idx) => idx !== i) }))
  }

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_settings: JSON.stringify(settings),
          extra_context: extraContext,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }, [id, settings, extraContext])

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
                  <button onClick={() => toggle(f.key as keyof AiSettings)} className="mt-0.5 shrink-0">
                    {enabled
                      ? <ToggleRight size={24} className="text-indigo-600" />
                      : <ToggleLeft size={24} className="text-slate-300" />}
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
          <textarea
            value={settings.internal_links}
            onChange={e => setSettings(s => ({ ...s, internal_links: e.target.value }))}
            rows={5}
            placeholder={SEO_TIPS[0].placeholder}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Info size={11} /> One rule per line. Use relative paths (/page) or full URLs.
          </p>
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

          {settings.url_rules.length > 0 && (
            <div className="space-y-2 mb-4">
              {settings.url_rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700 min-w-0 truncate">{rule.keyword}</span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <a href={rule.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 truncate flex items-center gap-1 min-w-0">
                    {rule.url} <ExternalLink size={11} className="shrink-0" />
                  </a>
                  {rule.label && <span className="text-slate-400 text-xs shrink-0">"{rule.label}"</span>}
                  <button onClick={() => removeUrlRule(i)} className="ml-auto shrink-0 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <input
              value={newRule.keyword}
              onChange={e => setNewRule(r => ({ ...r, keyword: e.target.value }))}
              placeholder='Keyword (e.g. "Mailchimp")'
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              value={newRule.url}
              onChange={e => setNewRule(r => ({ ...r, url: e.target.value }))}
              placeholder="URL (e.g. /email-tools)"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              value={newRule.label}
              onChange={e => setNewRule(r => ({ ...r, label: e.target.value }))}
              placeholder='Link label (optional, e.g. "our review")'
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={addUrlRule}
            disabled={!newRule.keyword || !newRule.url}
            className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 font-medium"
          >
            <Plus size={14} /> Add rule
          </button>
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
