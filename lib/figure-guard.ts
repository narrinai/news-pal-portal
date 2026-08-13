/**
 * Hard guarantee against invented statistics.
 *
 * The prompts already tell every model not to add figures that aren't in the source, and
 * every model ignores that eventually — hence the "340% growth" and "4.2 billion users"
 * that kept turning up in published articles with no such number anywhere in the source.
 * This module is the enforcement layer, in the same spirit as sanitizeArticleLinks():
 * whatever the prompt asked for, a number that cannot be traced back to the source text
 * does not reach a page.
 *
 * Every figure in the generated article is normalised (4.2b == 4,2 miljard == 4200 million)
 * and looked up in the set of numbers that actually appear in the trusted text — the source
 * article(s) plus the operator's own instructions. Unsupported figures take their carrier
 * with them: a whole stat card or table if that's where they sit, otherwise the sentence.
 */

/** A number found in text, normalised so notations can be compared across languages. */
export interface NumericClaim {
  /** As written, e.g. "4.2 billion" or "340%". */
  raw: string
  /** Scaled value: "4.2 billion" → 4.2e9. */
  value: number
  /** The number before any scale word was applied: "4.2 billion" → 4.2. */
  mantissa: number
  kind: 'percent' | 'currency' | 'scaled' | 'multiplier' | 'plain'
}

const SCALE: Record<string, number> = {
  k: 1e3, thousand: 1e3, duizend: 1e3, tausend: 1e3,
  m: 1e6, mln: 1e6, mio: 1e6, million: 1e6, millions: 1e6, miljoen: 1e6, millionen: 1e6,
  b: 1e9, bn: 1e9, mrd: 1e9, billion: 1e9, billions: 1e9, miljard: 1e9, milliarden: 1e9,
  t: 1e12, trillion: 1e12, biljoen: 1e12, billionen: 1e12,
}

const PERCENT_WORDS = ['percent', 'procent', 'prozent', 'pct', 'percentage point', 'percentage points', 'procentpunt', 'prozentpunkte']
const BPS_WORDS = ['bps', 'basis points', 'basispunten', 'basispunkte']

const NUM = String.raw`\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`
// Single-letter scale suffixes must be glued to the number ("4.2b"), because "5 m" is
// metres far more often than millions. Spelled-out scale words take a space.
const TIGHT = String.raw`k|m|b|bn|mln|mrd|mio|bps|x`
const WORDY = [...Object.keys(SCALE).filter(w => w.length > 2), ...PERCENT_WORDS, ...BPS_WORDS]
  .sort((a, b) => b.length - a.length)
  .join('|')

const FIGURE_RE = new RegExp(
  String.raw`([€$£¥])?\s*(${NUM})(?:\s*(%)|(${TIGHT})(?![\w])|[\s ]+(${WORDY})\b)?`,
  'gi'
)

/** Parse a number written in either the English (1,234.5) or continental (1.234,5) style. */
function parseNumber(raw: string): number {
  const s = raw.replace(/[\s ]/g, '')
  // 1.234.567 / 1,234,567 — separators are thousands markers only.
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return parseFloat(s.replace(/[.,]/g, ''))
  // 1.234,56 / 1,234.56 — grouped, then a different character for the decimals.
  const mixed = s.match(/^(\d{1,3}(?:([.,])\d{3})+)([.,])(\d+)$/)
  if (mixed && mixed[2] !== mixed[3]) return parseFloat(mixed[1].replace(/[.,]/g, '') + '.' + mixed[4])
  return parseFloat(s.replace(',', '.'))
}

/** Every number in a piece of text, with its notation resolved to a value. */
export function extractClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = []
  const clean = (text || '').replace(/\s+/g, ' ')
  for (const m of clean.matchAll(FIGURE_RE)) {
    const [, currency, num, pct, tight, wordy] = m
    const mantissa = parseNumber(num)
    if (!Number.isFinite(mantissa)) continue

    const suffix = (tight || wordy || '').toLowerCase()
    let kind: NumericClaim['kind'] = 'plain'
    let value = mantissa

    if (pct || PERCENT_WORDS.includes(suffix)) {
      kind = 'percent'
    } else if (BPS_WORDS.includes(suffix)) {
      kind = 'percent'
    } else if (suffix === 'x') {
      kind = 'multiplier'
    } else if (SCALE[suffix]) {
      kind = currency ? 'currency' : 'scaled'
      value = mantissa * SCALE[suffix]
    } else if (currency) {
      kind = 'currency'
    }

    claims.push({ raw: m[0].trim(), value, mantissa, kind })
  }
  return claims
}

/** A plain year is not a statistic, and neither is "3 ways to…". */
function isRisky(c: NumericClaim): boolean {
  if (c.kind !== 'plain') return true
  if (Number.isInteger(c.value) && c.value >= 1900 && c.value <= 2100) return false
  return c.value >= 100
}

const TOLERANCE = 0.015

function matches(a: number, b: number): boolean {
  if (a === b) return true
  const scale = Math.max(Math.abs(a), Math.abs(b))
  if (scale === 0) return false
  return Math.abs(a - b) <= TOLERANCE * scale
}

/** The set of values a figure may legitimately take, built from text we trust. */
export function buildSupportedValues(trustedText: string): number[] {
  const values = new Set<number>()
  for (const c of extractClaims(trustedText)) {
    values.add(c.value)
    values.add(c.mantissa)
  }
  return [...values]
}

function isSupported(c: NumericClaim, supported: number[]): boolean {
  // A rounded restatement of a source figure is honest journalism, so allow a small
  // tolerance, and accept the un-scaled reading too ("4.2" in a table headed "billions").
  return supported.some(v => matches(c.value, v) || matches(c.mantissa, v))
}

/**
 * The figures in `text` that cannot be traced to `trustedText`, deduplicated and in the
 * order they appear. Exported so a caller can put them in a retry prompt.
 */
export function collectUnsupportedFigures(text: string, trustedText: string): string[] {
  const supported = buildSupportedValues(trustedText)
  const out: string[] = []
  for (const c of extractClaims(text)) {
    if (!isRisky(c) || isSupported(c, supported)) continue
    if (!out.includes(c.raw)) out.push(c.raw)
  }
  return out
}

// ── HTML surgery ─────────────────────────────────────────────────────

/** Ranges of `<tag>…</tag>` at nesting depth 0, so a nested div doesn't cut a block short. */
function topLevelBlocks(html: string, tag: string): { start: number; end: number; inner: string }[] {
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, 'gi')
  const blocks: { start: number; end: number; inner: string }[] = []
  let depth = 0
  let start = -1
  for (const m of html.matchAll(re)) {
    const isClose = m[0].startsWith('</')
    if (!isClose) {
      if (depth === 0) start = m.index!
      depth++
    } else if (depth > 0) {
      depth--
      if (depth === 0 && start >= 0) {
        const end = m.index! + m[0].length
        blocks.push({ start, end, inner: html.slice(start, end) })
        start = -1
      }
    }
  }
  return blocks
}

/** Stat-card rows, bar charts and the like — decoration whose only content is figures. */
function isDataVisual(inner: string): boolean {
  return /display\s*:\s*flex/i.test(inner) || /<td\b/i.test(inner) || /class="[^"]*\b(stat|chart|data)/i.test(inner)
}

function wordCount(html: string): number {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

const SENTENCE_SPLIT = /(?<=[.!?…])\s+/

/** Drop whole sentences from text nodes, leaving markup and <style>/<script> untouched. */
function stripSentences(html: string, isBad: (s: string) => boolean): { html: string; removed: number } {
  const parts = html.split(/(<[^>]+>)/g)
  let skipDepth = 0
  let removed = 0
  const out = parts.map((part, i) => {
    if (i % 2 === 1) {
      if (/^<(style|script)\b/i.test(part)) skipDepth++
      else if (/^<\/(style|script)/i.test(part)) skipDepth = Math.max(0, skipDepth - 1)
      return part
    }
    if (skipDepth > 0 || !part.trim()) return part
    const sentences = part.split(SENTENCE_SPLIT)
    const kept = sentences.filter(s => {
      if (!isBad(s)) return true
      removed++
      return false
    })
    if (kept.length === sentences.length) return part
    const joined = kept.join(' ').replace(/\s+/g, ' ')
    // Preserve the leading/trailing space so words don't glue onto adjacent inline tags.
    return joined ? `${/^\s/.test(part) ? ' ' : ''}${joined}${/\s$/.test(part) ? ' ' : ''}` : ''
  })
  return { html: out.join(''), removed }
}

/** Tags left holding nothing after a strip would render as stray whitespace or bullets. */
function dropEmptyTags(html: string): string {
  let out = html
  for (let i = 0; i < 3; i++) {
    out = out
      .replace(/<(p|li|h2|h3|h4|strong|em|span|blockquote)\b[^>]*>\s*(<br\s*\/?>)?\s*<\/\1>/gi, '')
      .replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/gi, '')
      .replace(/<section\b[^>]*>\s*<\/section>/gi, '')
  }
  return out
}

export interface FigureGuardResult {
  html: string
  /** Data visuals (tables, stat blocks) removed whole. */
  removedBlocks: number
  /** Prose sentences removed. */
  removedSentences: number
  /** Every unsupported figure that was found, for logging and retry prompts. */
  unsupported: string[]
  /** Too much of the article rested on invented numbers to publish what's left. */
  severe: boolean
}

/**
 * Strip every figure from `html` that does not appear in `trustedText`.
 *
 * `severe` is the signal not to publish at all: it means the article leaned on invented
 * numbers so heavily that what survives is no longer the article that was written.
 */
export function guardFigures(
  html: string,
  trustedText: string,
  opts: { maxLossRatio?: number; minWords?: number; maxUnsupported?: number } = {}
): FigureGuardResult {
  const maxLossRatio = opts.maxLossRatio ?? 0.3
  const minWords = opts.minWords ?? 80
  const maxUnsupported = opts.maxUnsupported ?? 5

  const unsupported = collectUnsupportedFigures(html.replace(/<style[\s\S]*?<\/style>/gi, ' '), trustedText)
  if (unsupported.length === 0) {
    return { html, removedBlocks: 0, removedSentences: 0, unsupported: [], severe: false }
  }

  // Figures are collected from whitespace-normalised text, so compare against the same —
  // otherwise "€1.5 million" split across a line break would slip through unmatched.
  const hasBadFigure = (s: string) => {
    const flat = s.replace(/\s+/g, ' ')
    return unsupported.some(f => flat.includes(f))
  }
  const startWords = wordCount(html)
  let out = html
  let removedBlocks = 0

  // A stat card or table built on an invented number is worthless without it — take the
  // whole element rather than leaving a card reading "— users".
  for (const tag of ['table', 'figure', 'div']) {
    const doomed = topLevelBlocks(out, tag)
      .filter(b => (tag === 'div' ? isDataVisual(b.inner) : true))
      .filter(b => hasBadFigure(b.inner.replace(/<[^>]+>/g, ' ')))
    for (const b of doomed.reverse()) {
      out = out.slice(0, b.start) + out.slice(b.end)
      removedBlocks++
    }
  }

  const stripped = stripSentences(out, hasBadFigure)
  out = dropEmptyTags(stripped.html)

  const endWords = wordCount(out)
  const lost = startWords > 0 ? (startWords - endWords) / startWords : 0
  // A draft that invents this many separate figures is untrustworthy as a whole, however
  // little text the stripping actually cost.
  const severe = lost > maxLossRatio || endWords < minWords || unsupported.length >= maxUnsupported

  return { html: out, removedBlocks, removedSentences: stripped.removed, unsupported, severe }
}

/** Same treatment for plain text fields (summary, subtitle, meta description). */
export function guardText(text: string, trustedText: string): string {
  if (!text) return text
  const unsupported = collectUnsupportedFigures(text, trustedText)
  if (!unsupported.length) return text
  return text
    .split(SENTENCE_SPLIT)
    .filter(s => !unsupported.some(f => s.replace(/\s+/g, ' ').includes(f)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** FAQ answers are prose the model writes freely, so they invent figures just as readily. */
export function guardFaq(
  faq: { question: string; answer: string }[] | undefined,
  trustedText: string
): { faq: { question: string; answer: string }[]; dropped: number } {
  if (!Array.isArray(faq) || !faq.length) return { faq: faq || [], dropped: 0 }
  const kept = faq.filter(
    f => collectUnsupportedFigures(`${f.question} ${f.answer}`, trustedText).length === 0
  )
  return { faq: kept, dropped: faq.length - kept.length }
}
