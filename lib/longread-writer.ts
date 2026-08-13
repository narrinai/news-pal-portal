import OpenAI from 'openai'
import { parseRewriteResponse } from './ai-rewriter'
import { injectInlineImages } from './image-search'
import { SourceLink, buildAllowedSourcesBlock, dedupeSources } from './source-links'
import { guardFigures, guardText, guardFaq } from './figure-guard'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// One model for both stages; overridable per-deployment without a code change.
const MODEL = process.env.LONGREAD_MODEL || 'gpt-4o'

export interface DossierSource {
  url: string
  title: string
  outlet?: string
  publishedAt?: string
  /** Scraped body text. Truncated before it reaches the prompt. */
  content?: string
}

export interface LongreadOptions {
  language: 'nl' | 'en' | 'de'
  targetAudience?: string
  /** Site/brand context and operator rules, same shape the rewriter receives. */
  extraInstructions?: string
  /**
   * Extra citable URLs that aren't dossier entries — typically the outbound links the
   * dossier's own articles link to. Real and on-topic, but with no body text of their
   * own, so they join the allowlist without bloating the prompt.
   */
  extraSources?: SourceLink[]
}

export interface LongreadAngle {
  thesis: string
  tension: string
  title_direction: string
  sections: { heading: string; purpose: string; source_urls: string[] }[]
  what_to_watch: string
  counterargument: string
}

/** Words per minute used for the reading-time badge. */
const WPM = 220

// Keep each source's excerpt bounded so a 10-source dossier stays well inside context.
const MAX_CHARS_PER_SOURCE = 6000

function dossierToPrompt(dossier: DossierSource[]): string {
  return dossier
    .map((s, i) => {
      const body = (s.content || '').slice(0, MAX_CHARS_PER_SOURCE)
      return `[SOURCE ${i + 1}]
TITLE: ${s.title}
OUTLET: ${s.outlet || ''}
DATE: ${s.publishedAt || 'unknown'}
URL: ${s.url}
TEXT:
${body}`
    })
    .join('\n\n---\n\n')
}

const ANGLE_SYSTEM = `You are a senior investigative editor. You read a dossier of reporting on one topic and decide what the piece should ARGUE — not what it should summarise.

A good angle names a tension, a contradiction, or a consequence that the individual news reports left implicit. A bad angle restates the news.

You have no web access. Work only from the dossier. Never invent facts, figures, dates or URLs.

Respond with JSON only.`

function angleUserPrompt(topic: string, dossier: DossierSource[], options: LongreadOptions): string {
  const langName = options.language === 'en' ? 'English' : options.language === 'de' ? 'German' : 'Dutch'
  return `TOPIC: ${topic}

DOSSIER (${dossier.length} sources):

${dossierToPrompt(dossier)}

---

Design a deep-dive long read (2500-3500 words) built on this dossier, to be written in ${langName}.
${options.targetAudience ? `\nTARGET AUDIENCE: ${options.targetAudience}\n` : ''}
Decide:
1. THESIS — the single claim the piece argues. One sentence. It must be contestable: if nobody could disagree with it, it is not a thesis.
2. TENSION — the conflict that makes this worth 3000 words: who wants what, what is at stake, what does not add up.
3. TITLE DIRECTION — the angle a headline should take. Not the headline itself.
4. SECTIONS — 5 to 7 sections. Each needs a heading, a one-line purpose, and the source URLs (copied exactly from the dossier) that section leans on. Every section must advance the argument; none may be a generic "background" or "conclusion" filler section. Include one section that traces how this developed over time, and one that examines who benefits.
5. COUNTERARGUMENT — the strongest case against the thesis, which the piece must address honestly rather than strawman.
6. WHAT TO WATCH — the concrete, checkable signals a reader should follow next.

Write every "heading" in ${langName}, since they are used verbatim as the article's section headings. The other fields are editorial notes and may be in English.

Return JSON exactly in this shape:
{
  "thesis": "...",
  "tension": "...",
  "title_direction": "...",
  "sections": [{"heading": "...", "purpose": "...", "source_urls": ["..."]}],
  "counterargument": "...",
  "what_to_watch": "..."
}`
}

/** Stage 1: decide what the piece argues, before spending tokens writing it. */
export async function generateAngle(
  topic: string,
  dossier: DossierSource[],
  options: LongreadOptions
): Promise<LongreadAngle> {
  const completion = await openai.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: 'system', content: ANGLE_SYSTEM },
        { role: 'user', content: angleUserPrompt(topic, dossier, options) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1500,
    },
    { timeout: 120000 }
  )

  const raw = completion.choices[0]?.message?.content || ''
  if (!raw) throw new Error('Angle stage returned an empty response')

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Angle stage returned invalid JSON')
  }

  if (!parsed.thesis || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error('Angle stage returned no usable thesis or sections')
  }

  return {
    thesis: parsed.thesis,
    tension: parsed.tension || '',
    title_direction: parsed.title_direction || '',
    sections: parsed.sections.map((s: any) => ({
      heading: String(s.heading || ''),
      purpose: String(s.purpose || ''),
      source_urls: Array.isArray(s.source_urls) ? s.source_urls.filter((u: any) => typeof u === 'string') : [],
    })),
    counterargument: parsed.counterargument || '',
    what_to_watch: parsed.what_to_watch || '',
  }
}

const WRITE_SYSTEM: Record<string, string> = {
  nl: `Je bent een onderzoeksjournalist die diepgravende long reads schrijft, in de traditie van beschouwende techjournalistiek.

Je schrijft betogen, geen samenvattingen. Je hebt een standpunt en je onderbouwt het met wat er in het dossier staat.

CRUCIAAL — feitelijke nauwkeurigheid: verzin NOOIT feiten, cijfers, datums, namen of citaten die niet in het dossier staan. Je hebt geen internettoegang. Ontbreekt een detail, laat het weg.`,
  en: `You are an investigative journalist who writes deeply reported long reads in the tradition of analytical technology journalism.

You write arguments, not summaries. You take a position and support it with what the dossier actually contains.

CRITICAL — factual accuracy: NEVER invent facts, figures, dates, names or quotes that are not in the dossier. You have no web access. If a detail is missing, leave it out.`,
  de: `Du bist ein Investigativjournalist, der tiefgehende Long Reads in der Tradition analytischer Technologiejournalistik schreibt.

Du schreibst Argumentationen, keine Zusammenfassungen. Du beziehst Position und belegst sie mit dem, was im Dossier steht.

KRITISCH — Faktentreue: Erfinde NIEMALS Fakten, Zahlen, Daten, Namen oder Zitate, die nicht im Dossier stehen. Du hast keinen Internetzugang. Fehlt ein Detail, lass es weg.`,
}

function langName(lang: LongreadOptions['language']): string {
  return lang === 'en' ? 'English' : lang === 'de' ? 'German' : 'Dutch'
}

function labelsFor(lang: LongreadOptions['language']) {
  return lang === 'nl'
    ? { sources: 'Bronnen', key: 'Kern van het verhaal', sectionId: 'bronnen' }
    : lang === 'de'
    ? { sources: 'Quellen', key: 'Der Kern', sectionId: 'quellen' }
    : { sources: 'Sources', key: 'The short version', sectionId: 'sources' }
}

/**
 * Which visual element each section carries. Assigning them up front is what stops every
 * section from opening with an image, or none of them having one. Images are absent here
 * on purpose — the model kept dropping them, so injectInlineImages() places them afterwards
 * from a real image search, which also keeps the photos relevant instead of recycling a
 * hardcoded ID list.
 */
function visualBriefFor(index: number, total: number, labels: ReturnType<typeof labelsFor>): string {
  if (index === 0) {
    return `End this section with a "${labels.key}" box:
<div style="margin:2rem 0;padding:1.25rem 1.5rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px"><strong style="display:block;margin-bottom:.5rem">${labels.key}</strong><ul style="margin:0;padding-left:1.2rem"><li>[point]</li><li>[point]</li><li>[point]</li></ul></div>`
  }
  if (index === 2) {
    return `Include ONE data element — whichever the material actually supports, and never invent numbers to fill it:
- Table: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:10px 14px;border-bottom:2px solid #e2e8f0;font-weight:600">Header</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px 14px">Data</td></tr></tbody></table>
- Or a timeline as an ordered list with bold dates/milestones.`
  }
  if (index === Math.max(3, total - 3) && index < total - 1) {
    return `Include ONE pull quote on the sentence that carries the argument:
<blockquote style="margin:2rem 0;padding:1.25rem 1.5rem;border-left:4px solid #4f46e5;background:#f8fafc;font-size:19px;line-height:1.5;color:#1e293b">[sentence]</blockquote>`
  }
  return 'No visual element in this section — plain prose. Do NOT insert an image; images are added separately.'
}


/**
 * Prompt for a single section. Sections are written one at a time because a single call
 * asked for 3000 words reliably delivers 700: it satisfies the outline and stops. Per
 * section, the word target is small enough that the model actually meets it.
 */
function sectionPrompt(
  topic: string,
  angle: LongreadAngle,
  index: number,
  dossier: DossierSource[],
  sources: SourceLink[],
  previousSummaries: string[],
  options: LongreadOptions
): string {
  const section = angle.sections[index]
  const total = angle.sections.length
  const labels = labelsFor(options.language)
  const isFirst = index === 0
  const isLast = index === total - 1

  // Give this section the sources its outline assigned, falling back to the whole
  // dossier when the angle stage didn't map any.
  const assigned = dossier.filter(d => section.source_urls.some(u => u && d.url.includes(u.replace(/\/$/, '').split('#')[0])))
  const relevant = assigned.length ? assigned : dossier

  const roleBrief = isFirst
    ? `This is the OPENING section. Your first sentence must name a specific thing from the dossier: a named person doing something, a named company, a dated incident, a concrete number. Something a reader could picture.

BANNED OPENINGS — if your first sentence resembles any of these, rewrite it:
- "In een wereld waar…" / "In a world where…" / "In einer Welt, in der…"
- "In een tijd waarin…" / "In recent months/years…" / "In den letzten Jahren…"
- "De opkomst van…" / "The rise of…" / "Der Aufstieg von…"
- "Technologie wordt steeds belangrijker" or any variation on "X is becoming increasingly important"
- Any sentence that could open an article on a completely different subject.

By the end of this section the reader must know what the piece argues — shown through the material, never announced ("in dit artikel bespreken we" is forbidden).`
    : isLast
    ? `This is the CLOSING section. Do NOT summarise what came before. End on concrete, checkable signals the reader should watch: ${angle.what_to_watch}`
    : `This is a middle section. It must ADVANCE the argument, not restate it.`

  const counterBrief =
    index === total - 2
      ? `\nThis section must state the strongest case AGAINST the thesis in its most convincing form — ${angle.counterargument} — and then answer it honestly. If part of it stands, say so.\n`
      : ''

  const priorContext = previousSummaries.length
    ? `\nALREADY COVERED in earlier sections (do NOT repeat these points; you may build on them):\n${previousSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : ''

  return `TOPIC: ${topic}
THESIS OF THE PIECE: ${angle.thesis}
TENSION: ${angle.tension}

You are writing section ${index + 1} of ${total}: "${section.heading}"
PURPOSE OF THIS SECTION: ${section.purpose}

${roleBrief}${counterBrief}${priorContext}
SOURCE MATERIAL FOR THIS SECTION:

${dossierToPrompt(relevant)}

---

Write ONLY this section, in ${langName(options.language)}, 450-600 words. Sections shorter than 450 words are rejected.
${options.targetAudience ? `\nTARGET AUDIENCE: ${options.targetAudience}\n` : ''}
LANGUAGE: every word — the heading, the prose, the captions, the table labels — must be in ${langName(options.language)}.

CRAFT:
- Flowing prose in 4-6 substantial paragraphs. Not bullet points, not a listicle.
- Attribute claims in the text the way a long read does ("volgens", "according to reporting by", "as X documented").
- Every factual claim must come from the source material above. Invent nothing — no figures, dates, names or quotes that aren't there.
- No corporate jargon, no "Executive Summary", no meta-commentary about the article itself.

${buildAllowedSourcesBlock(sources, options.language)}

VISUAL ELEMENT FOR THIS SECTION:
${visualBriefFor(index, total, labels)}

Return ONLY this HTML block, nothing before or after:
<section class="content-section" id="[slug-of-the-heading]">
<h2>${section.heading}</h2>
<p>...</p>
</section>`
}

/** Final pass: headline, dek and SEO written against the finished piece, plus the FAQ. */
function frontMatterPrompt(topic: string, angle: LongreadAngle, bodyText: string, options: LongreadOptions): string {
  return `You have just finished this long read. Now write its headline, dek, SEO metadata and FAQ.

TOPIC: ${topic}
THESIS: ${angle.thesis}
TITLE DIRECTION: ${angle.title_direction}

THE FINISHED PIECE (text only):
${bodyText.slice(0, 9000)}

---

Everything you write must be in ${langName(options.language)} — the title above all. A title in the wrong language is a failure.

- title: the headline. It must promise the ARGUMENT, not report the news. No colon-subtitle cliché if you can avoid it. Contains the focus keyword naturally.
- subtitle: one line that states what is at stake.
- category: one or two word topic label.
- focus_keyword: 2-4 word search phrase, present in the title and in the opening paragraph.
- meta_description: 140-155 characters, contains the focus keyword.
- seo_keywords: 5-8 related search terms.
- faq: exactly 5 items. Questions a reader would genuinely ask AFTER reading this, answered in 2-3 sentences from the piece.

Return JSON:
{"title":"...","subtitle":"...","category":"...","focus_keyword":"...","meta_description":"...","seo_keywords":["..."],"faq":[{"question":"...","answer":"..."}]}`
}

/**
 * Two-stage deep-dive generation: decide the argument, then write it.
 *
 * Splitting these is deliberate. A single call that must cluster, choose an angle AND
 * produce 3000 words reliably defaults to the safest angle and drifts into summarising
 * the sources. Forcing the thesis out first, then handing it back as an instruction, is
 * what separates a beschouwing from a long news article. The angle call is small, so
 * the extra cost is a few cents.
 */
export async function writeLongread(
  topic: string,
  dossier: DossierSource[],
  options: LongreadOptions
): Promise<{
  title: string
  content: string
  content_html: string
  subtitle?: string
  category?: string
  faq?: { question: string; answer: string }[]
  focus_keyword?: string
  meta_description?: string
  seo_keywords?: string[]
  reading_time: number
  angle: LongreadAngle
  sources: SourceLink[]
}> {
  if (!dossier.length) throw new Error('Cannot write a longread from an empty dossier')

  // Only URLs we actually fetched are citable.
  const sources = dedupeSources([
    ...dossier.map(d => ({ url: d.url, title: `${d.outlet ? `${d.outlet} — ` : ''}${d.title}`, origin: 'cluster' as const })),
    ...(options.extraSources || []),
  ])

  console.log(`[longread] Stage 1/3 — angle for "${topic}" from ${dossier.length} sources`)
  const angle = await generateAngle(topic, dossier, options)
  console.log(`[longread] Thesis: ${angle.thesis}`)

  const systemPrompt = options.extraInstructions
    ? `${WRITE_SYSTEM[options.language]}\n\nADDITIONAL CONTEXT:\n${options.extraInstructions}`
    : WRITE_SYSTEM[options.language]

  // Stage 2: one call per section. Each keeps a summary of what came before so the piece
  // builds instead of circling, and the per-call word target is small enough to be met.
  console.log(`[longread] Stage 2/3 — writing ${angle.sections.length} sections with ${MODEL}`)
  const sectionHtml: string[] = []
  const summaries: string[] = []

  for (let i = 0; i < angle.sections.length; i++) {
    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sectionPrompt(topic, angle, i, dossier, sources, summaries, options) },
        ],
        temperature: 0.75,
        max_tokens: 2000,
      },
      { timeout: 180000 }
    )

    const html = (completion.choices[0]?.message?.content || '')
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    if (!html) {
      console.warn(`[longread] Section ${i + 1} came back empty, skipping it`)
      continue
    }

    sectionHtml.push(html)
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    summaries.push(`${angle.sections[i].heading}: ${plain.slice(0, 400)}`)
    console.log(`[longread]   §${i + 1}/${angle.sections.length} "${angle.sections[i].heading}" — ${plain.split(/\s+/).length} words`)
  }

  if (!sectionHtml.length) throw new Error('Longread write stage produced no sections')

  const labels = labelsFor(options.language)
  const bodyText = sectionHtml.join('\n\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  // Stage 3: the headline is written last, against the finished piece, so it promises
  // what the article actually delivers.
  console.log('[longread] Stage 3/3 — headline, SEO and FAQ')
  const metaCompletion = await openai.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: frontMatterPrompt(topic, angle, bodyText, options) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    },
    { timeout: 120000 }
  )

  let meta: any = {}
  try {
    meta = JSON.parse(metaCompletion.choices[0]?.message?.content || '{}')
  } catch {
    console.warn('[longread] Front-matter stage returned invalid JSON, falling back to the topic as title')
  }

  const sourcesSection = `<section class="content-section" id="${labels.sectionId}">
<h2>${labels.sources}</h2>
<ul>
${sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a></li>`).join('\n')}
</ul>
</section>`

  // Re-assemble into the same envelope the rewriter produces, so parsing, link
  // sanitising and the responsive-CSS wrapper all stay in one place.
  const faqBlock = Array.isArray(meta.faq) && meta.faq.length
    ? `\n\n---FAQ---\n${meta.faq.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
    : ''

  const response = `${meta.title || topic}
SUBTITLE: ${meta.subtitle || ''}
CATEGORY: ${meta.category || ''}
FOCUS_KEYWORD: ${meta.focus_keyword || ''}
META_DESCRIPTION: ${meta.meta_description || ''}
SEO_KEYWORDS: ${Array.isArray(meta.seo_keywords) ? meta.seo_keywords.join(', ') : ''}
---
${sectionHtml.join('\n\n')}

${sourcesSection}${faqBlock}`

  // Operator-supplied URLs (internal links, keyword rules) stay citable alongside the dossier.
  const operatorUrls = (options.extraInstructions || '').match(/https?:\/\/[^\s"'<>)\]]+/g) || []
  const parsed = parseRewriteResponse(response, topic, sources, operatorUrls)

  // A 3000-word piece written across several calls is exactly where invented statistics
  // creep in, so every figure has to trace back to the dossier — same rule as the rewriter.
  const trustedText = [
    ...dossier.map(d => `${d.title}\n${d.content || ''}`),
    options.extraInstructions || '',
  ].join('\n')
  // A longread is sectioned, so losing one passage costs proportionally less than in a
  // 300-word news item — but a piece whose argument rests on invented numbers is still spiked.
  const guard = guardFigures(parsed.content_html, trustedText, {
    maxLossRatio: 0.25,
    minWords: 800,
    maxUnsupported: 8,
  })
  if (guard.unsupported.length) {
    if (guard.severe) {
      throw new Error(
        `Longread rejected: it relies on figures that are not in the dossier (${guard.unsupported.slice(0, 8).join(', ')})`
      )
    }
    console.warn(
      `⚠️ [longread] Removed ${guard.unsupported.length} unsupported figure(s) (${guard.removedBlocks} block(s), ${guard.removedSentences} sentence(s)): ${guard.unsupported.slice(0, 8).join(', ')}`
    )
    parsed.content_html = guard.html
    parsed.content = guardText(parsed.content, trustedText)
    if (parsed.subtitle) parsed.subtitle = guardText(parsed.subtitle, trustedText)
    if (parsed.meta_description) {
      const cleaned = guardText(parsed.meta_description, trustedText)
      parsed.meta_description = cleaned.length >= 40 ? cleaned : undefined
    }
    const faqGuard = guardFaq(parsed.faq, trustedText)
    if (faqGuard.dropped) {
      console.warn(`⚠️ [longread] Dropped ${faqGuard.dropped} FAQ item(s) built on unsupported figures`)
      parsed.faq = faqGuard.faq
    }
  }

  try {
    parsed.content_html = await injectInlineImages(parsed.content_html, {
      count: 2,
      topic: parsed.focus_keyword || topic,
    })
  } catch (e: any) {
    console.warn('[longread] Inline image injection failed:', e?.message)
  }

  const wordCount = (parsed.content || '').split(/\s+/).filter(Boolean).length
  const reading_time = Math.max(1, Math.round(wordCount / WPM))
  console.log(`[longread] ✅ "${parsed.title}" — ${wordCount} words, ${reading_time} min`)

  return { ...parsed, reading_time, angle, sources }
}
