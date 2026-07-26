'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ExternalLink, RefreshCw, MousePointerClick, Eye, Percent, TrendingUp, Link2, AlertCircle, CheckCircle2 } from 'lucide-react'

type Automation = { id: string; name: string; site_url?: string; gsc_property?: string }
type Site = { siteUrl: string; permissionLevel: string }
type Totals = { clicks: number; impressions: number; ctr: number; position: number }
type TrendPoint = { date: string; clicks: number; impressions: number }
type QueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number }
type ArticleRow = { id: string; title: string; url: string | null; publishedAt: string; clicks: number; impressions: number; ctr: number; position: number; matched: boolean }
type PageRow = { page: string; clicks: number; impressions: number; ctr: number; position: number }

type InsightsData = {
  property: string
  range: { startDate: string; endDate: string; days: number }
  totals: Totals
  trend: TrendPoint[]
  topQueries: QueryRow[]
  topPages: PageRow[]
  perArticle: ArticleRow[]
  articleCount: number
  matchedCount: number
}

const RANGES = [
  { label: '7 dagen', value: 7 },
  { label: '28 dagen', value: 28 },
  { label: '3 maanden', value: 90 },
  { label: '6 maanden', value: 180 },
]

const nf = new Intl.NumberFormat('nl-NL')
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const pos = (n: number) => (n ? n.toFixed(1) : '–')

export default function InsightsPage() {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; sites: Site[] } | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [range, setRange] = useState(28)
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingProp, setSavingProp] = useState(false)

  const selected = automations.find((a) => a.id === selectedId)

  // Load connection status + automations on mount
  useEffect(() => {
    fetch('/api/insights/google/status').then((r) => r.json()).then(setStatus).catch(() => setStatus({ configured: false, connected: false, sites: [] }))
    fetch('/api/automations')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Automation[]) => {
        if (!Array.isArray(list)) return
        setAutomations(list)
        if (list.length) setSelectedId((prev) => prev || list[0].id)
      })
      .catch(() => {})
  }, [])

  // Handle ?connected / ?error coming back from the OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError(decodeURIComponent(params.get('error') as string))
    if (params.get('connected') || params.get('error')) {
      window.history.replaceState({}, '', '/dashboard/insights')
    }
  }, [])

  const loadData = useMemo(
    () => async (automationId: string, days: number) => {
      if (!automationId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/insights/data?automation_id=${automationId}&range=${days}`)
        const json = await res.json()
        if (!res.ok) {
          setData(null)
          setError(json.message || json.error || 'Kon data niet laden')
        } else {
          setData(json)
        }
      } catch (e: any) {
        setError(e?.message || 'Kon data niet laden')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch data whenever the selected automation (with a property) or range changes
  useEffect(() => {
    if (status?.connected && selected?.gsc_property) loadData(selectedId, range)
    else setData(null)
  }, [status?.connected, selectedId, selected?.gsc_property, range, loadData])

  async function saveProperty(property: string) {
    if (!selectedId) return
    setSavingProp(true)
    setError(null)
    try {
      const res = await fetch(`/api/automations/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gsc_property: property }),
      })
      if (!res.ok) throw new Error('Opslaan mislukt')
      setAutomations((prev) => prev.map((a) => (a.id === selectedId ? { ...a, gsc_property: property } : a)))
    } catch (e: any) {
      setError(e?.message || 'Opslaan mislukt')
    } finally {
      setSavingProp(false)
    }
  }

  async function disconnect() {
    await fetch('/api/insights/google/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect' }),
    })
    setStatus((s) => (s ? { ...s, connected: false, sites: [] } : s))
    setData(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Insights</h1>
            <p className="text-sm text-slate-500">Google Search Console — traffic per site en per artikel</p>
          </div>
        </div>
        {status?.connected && (
          <button onClick={disconnect} className="text-sm text-slate-500 hover:text-slate-800">Google ontkoppelen</button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Not configured */}
      {status && !status.configured && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-900 mb-2">Google OAuth is nog niet geconfigureerd</p>
          <p>Zet <code className="px-1 bg-slate-100 rounded">GOOGLE_CLIENT_ID</code>, <code className="px-1 bg-slate-100 rounded">GOOGLE_CLIENT_SECRET</code> en <code className="px-1 bg-slate-100 rounded">GOOGLE_OAUTH_REDIRECT_URI</code> in je environment en herstart.</p>
        </div>
      )}

      {/* Configured but not connected */}
      {status?.configured && !status.connected && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="font-medium text-slate-900 mb-1">Koppel Google Search Console</p>
          <p className="text-sm text-slate-500 mb-5">Log in met het Google-account dat toegang heeft tot je GSC-properties.</p>
          <a href="/api/insights/google/auth" className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Connect Google
          </a>
        </div>
      )}

      {/* Connected */}
      {status?.connected && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {automations.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-2 text-sm ${range === r.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadData(selectedId, range)}
              disabled={loading || !selected?.gsc_property}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Ververs
            </button>
          </div>

          {/* Property picker */}
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-slate-500">GSC-property voor </span>
                <span className="font-medium text-slate-800">{selected?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {selected?.gsc_property && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <select
                  value={selected?.gsc_property || ''}
                  onChange={(e) => saveProperty(e.target.value)}
                  disabled={savingProp}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 min-w-[240px]"
                >
                  <option value="">— kies een property —</option>
                  {status.sites.map((s) => (
                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                  ))}
                </select>
              </div>
            </div>
            {!selected?.gsc_property && (
              <p className="mt-2 text-xs text-slate-400">Kies welke Search Console property bij deze site hoort om data te tonen.</p>
            )}
            {status.sites.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">Geen properties gevonden. Heeft dit Google-account toegang in Search Console?</p>
            )}
          </div>

          {loading && <div className="text-sm text-slate-400 py-10 text-center">Data laden…</div>}

          {!loading && data && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={MousePointerClick} label="Clicks" value={nf.format(data.totals.clicks)} />
                <StatCard icon={Eye} label="Impressions" value={nf.format(data.totals.impressions)} />
                <StatCard icon={Percent} label="CTR" value={pct(data.totals.ctr)} />
                <StatCard icon={TrendingUp} label="Gem. positie" value={pos(data.totals.position)} />
              </div>

              {/* Trend */}
              <Card title={`Trend — clicks & impressions (${data.range.startDate} → ${data.range.endDate})`}>
                <TrendChart trend={data.trend} />
              </Card>

              {/* Per article */}
              <Card title={`Per gepubliceerd artikel (${data.matchedCount}/${data.articleCount} gematcht in GSC)`}>
                <Table
                  head={['Artikel', 'Clicks', 'Impr.', 'CTR', 'Pos.']}
                  rows={data.perArticle.map((a) => [
                    <span key="t" className="flex items-center gap-1.5">
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-slate-800 hover:text-indigo-600 truncate max-w-[380px] inline-flex items-center gap-1">
                          {a.title} <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      ) : (
                        <span className="text-slate-400 truncate max-w-[380px]" title="Niet gevonden in GSC">{a.title}</span>
                      )}
                    </span>,
                    nf.format(a.clicks),
                    nf.format(a.impressions),
                    a.matched ? pct(a.ctr) : '–',
                    a.matched ? pos(a.position) : '–',
                  ])}
                  empty="Nog geen gepubliceerde artikelen voor deze site."
                />
              </Card>

              {/* Top queries */}
              <Card title="Top zoektermen">
                <Table
                  head={['Zoekterm', 'Clicks', 'Impr.', 'CTR', 'Pos.']}
                  rows={data.topQueries.map((q) => [q.query, nf.format(q.clicks), nf.format(q.impressions), pct(q.ctr), pos(q.position)])}
                  empty="Nog geen query-data."
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white mb-6">
      <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-400 py-4 text-center">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            {head.map((h, i) => (
              <th key={i} className={`pb-2 font-medium ${i === 0 ? '' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-slate-50">
              {r.map((c, ci) => (
                <td key={ci} className={`py-2 ${ci === 0 ? 'text-slate-700' : 'text-right text-slate-600 tabular-nums'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Lightweight inline SVG line chart (clicks + impressions), no dependency.
function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (!trend.length) return <p className="text-sm text-slate-400 py-4 text-center">Geen trend-data.</p>
  const W = 720, H = 160, P = 8
  const maxClicks = Math.max(1, ...trend.map((t) => t.clicks))
  const maxImpr = Math.max(1, ...trend.map((t) => t.impressions))
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, trend.length - 1)
  const line = (vals: number[], max: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${(H - P - ((H - 2 * P) * v) / max).toFixed(1)}`).join(' ')
  return (
    <div>
      <div className="flex gap-4 mb-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Clicks</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 inline-block" /> Impressions</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
        <path d={line(trend.map((t) => t.impressions), maxImpr)} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
        <path d={line(trend.map((t) => t.clicks), maxClicks)} fill="none" stroke="#6366f1" strokeWidth={2} />
      </svg>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{trend[0].date}</span>
        <span>{trend[trend.length - 1].date}</span>
      </div>
    </div>
  )
}
