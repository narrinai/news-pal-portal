import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { injectInlineImages } from './image-search'
import {
  SourceLink,
  buildAllowedSourcesBlock,
  dedupeSources,
  sanitizeArticleLinks,
} from './source-links'
import { guardFigures, guardText, guardFaq } from './figure-guard'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null

const LENGTH_TIERS = ['short', 'medium', 'long', 'extra-long', 'longform'] as const
type LengthTier = typeof LENGTH_TIERS[number]

// The word range each tier asks the model for, matching the prompt text below.
const TIER_RANGE: Record<LengthTier, { min: number; max: number }> = {
  short: { min: 200, max: 300 },
  medium: { min: 400, max: 600 },
  long: { min: 700, max: 1000 },
  'extra-long': { min: 1200, max: 1500 },
  longform: { min: 2500, max: 3500 },
}

/**
 * How long an honest rewrite of a given source actually turns out.
 *
 * Fitted to measurements taken with the current prompt: a 15-word wire item yields ~199
 * words, a 1085-word central-bank summary yields ~296. Deliberately not an expansion
 * ratio — a thin item gets contextualised upward while a dense one gets condensed, so
 * the curve is nearly flat with a high floor.
 *
 * Re-measure and refit these two constants if the length or anti-invention wording in
 * the prompts changes materially; the model tracks those instructions closely.
 */
const BASE_OUTPUT_WORDS = 198
const SOURCE_YIELD = 0.09

/**
 * Round the requested tier DOWN to one the source can realistically fill.
 *
 * The point is to close the gap between what the prompt promises and what honestly comes
 * out. Asking for 700-1000 words and getting 450 leaves the model 300 words short of its
 * instruction every time — steady pressure to pad. Asking for 400-600 and getting 450
 * removes that pressure entirely. Never rounds up: the operator's setting stays a ceiling.
 */
export function effectiveLength(requested: LengthTier, sourceWords: number, sourceCount = 1): LengthTier {
  // Independent reports on one story carry genuinely different detail — one outlet has a
  // quote another lacks, one contradicts a third — so the honest yield per source word
  // rises with the number of sources. A single feed snippet has one angle and nothing to
  // compare it against.
  const yieldRate = SOURCE_YIELD * (1 + 0.6 * Math.max(0, sourceCount - 1))
  const expected = BASE_OUTPUT_WORDS + yieldRate * sourceWords

  let idx = 0
  for (let i = LENGTH_TIERS.length - 1; i >= 0; i--) {
    if (TIER_RANGE[LENGTH_TIERS[i]].min <= expected) {
      idx = i
      break
    }
  }

  const requestedIdx = Math.max(0, LENGTH_TIERS.indexOf(requested))
  return LENGTH_TIERS[Math.min(idx, requestedIdx)]
}

/** Does the source carry figures worth putting in a stat block or chart? */
export function hasUsableFigures(content: string): boolean {
  const text = (content || '').replace(/<[^>]+>/g, ' ')
  // Percentages (symbol or spelled out), currency amounts, basis points and scale words.
  // A bare year doesn't count — "in 2026" is not a statistic.
  const matches =
    text.match(
      /\d+(?:[.,]\d+)?\s*(?:%|percent|procent|Prozent|pct|basispunten|basis points|bps)|[€$£¥]\s*\d|\d+(?:[.,]\d+)?\s*(?:miljard|miljoen|billion|million|trillion|bn|mln|Mrd|Mio)/gi
    ) || []
  return matches.length >= 2
}

/** Another report on the same story, merged into one article rather than published apart. */
export interface RelatedSource {
  title: string
  url: string
  outlet?: string
  content: string
}

/**
 * Fold several reports on one story into a single source text. This is what makes a
 * longer article honest: three reports of 400 words carry enough material for a real
 * piece, where one 74-word wire snippet only ever supported a short one.
 */
function buildMultiSourceContent(primary: string, primaryTitle: string, related: RelatedSource[]): string {
  const blocks = [
    `[REPORT 1 — primary]\nHEADLINE: ${primaryTitle}\n${primary}`,
    ...related.map(
      (r, i) => `[REPORT ${i + 2}${r.outlet ? ` — ${r.outlet}` : ''}]\nHEADLINE: ${r.title}\n${(r.content || '').slice(0, 6000)}`
    ),
  ]
  return blocks.join('\n\n')
}

function synthesisInstructions(language: 'nl' | 'en' | 'de', count: number): string {
  if (language === 'en') {
    return `
SYNTHESIS — you have ${count} reports on the SAME story, not one:
- Write ONE article that draws on all of them. It is not a summary of each in turn.
- Where reports agree, state the fact once. Never repeat the same detail because two outlets carried it.
- Where reports differ or one adds a detail the others lack, that is the most valuable material you have — say who reported what.
- Where reports contradict each other, say so plainly instead of silently picking one.
- The result must read as a single original piece, with its own structure and ordering.`
  }
  if (language === 'de') {
    return `
SYNTHESE — dir liegen ${count} Berichte über DIESELBE Nachricht vor, nicht einer:
- Schreibe EINEN Artikel, der sich auf alle stützt. Es ist keine Zusammenfassung nacheinander.
- Wo die Berichte übereinstimmen, nenne die Tatsache einmal. Wiederhole ein Detail nie, nur weil zwei Medien es brachten.
- Wo Berichte abweichen oder einer ein Detail ergänzt, ist das dein wertvollstes Material — nenne, wer was berichtet hat.
- Widersprechen sich Berichte, sage das offen, statt still einen auszuwählen.
- Das Ergebnis muss als ein einziger origineller Text mit eigener Struktur lesbar sein.`
  }
  return `
SYNTHESE — je hebt ${count} berichten over HETZELFDE nieuwsfeit, niet één:
- Schrijf ÉÉN artikel dat uit alle berichten put. Het is geen samenvatting van elk bericht na elkaar.
- Waar de berichten het eens zijn, noem je het feit één keer. Herhaal een detail nooit omdat twee media het brachten.
- Waar berichten verschillen, of waar één bericht een detail heeft dat de andere missen: dat is je waardevolste materiaal — vermeld wie wat meldde.
- Spreken berichten elkaar tegen, benoem dat dan expliciet in plaats van er stilzwijgend één te kiezen.
- Het resultaat moet lezen als één origineel stuk, met een eigen structuur en volgorde.`
}

export interface RewriteOptions {
  style: 'professional' | 'engaging' | 'technical' | 'news'
  length: 'short' | 'medium' | 'long' | 'extra-long' | 'longform'
  language: 'nl' | 'en' | 'de'
  tone: 'neutral' | 'warning' | 'informative'
  targetAudience?: string
}

export async function rewriteArticle(
  originalTitle: string,
  originalContent: string,
  options: RewriteOptions = {
    style: 'professional',
    length: 'medium',
    language: 'nl',
    tone: 'informative'
  },
  customInstructions?: string,
  originalUrl?: string,
  allowedSources: SourceLink[] = [],
  relatedSources: RelatedSource[] = []
): Promise<{ title: string; content: string; content_html: string; subtitle?: string; category?: string; faq?: { question: string; answer: string }[]; focus_keyword?: string; meta_description?: string; seo_keywords?: string[] }> {
  // The original article is always citable; anything else must have been really seen.
  const sources = dedupeSources([
    ...(originalUrl ? [{ url: originalUrl, title: originalTitle, origin: 'source' as const }] : []),
    ...relatedSources.map(r => ({ url: r.url, title: `${r.outlet ? `${r.outlet} — ` : ''}${r.title}`, origin: 'cluster' as const })),
    ...allowedSources,
  ])

  // Reports on the same story are folded into one source text, so the length scaling
  // below sees the material that is genuinely available rather than one thin snippet.
  const effectiveContent = relatedSources.length
    ? buildMultiSourceContent(originalContent, originalTitle, relatedSources)
    : originalContent
  if (relatedSources.length) {
    console.log(`[rewrite] Synthesising ${relatedSources.length + 1} reports on the same story into one article`)
  }

  // URLs written into the custom instructions are supplied by the operator (internal
  // linking rules, keyword links, the site's own pages) — they are known-good and must
  // survive the link sanitizer even though they aren't scraped sources.
  const operatorUrls = (customInstructions || '').match(/https?:\/\/[^\s"'<>)\]]+/g) || []

  // Round the tier down to what this source can honestly fill, ONCE, and drive everything
  // downstream from it — prompt, token budget, model routing and image count. Keying any
  // of those off the operator's requested tier instead re-opens the padding pressure the
  // rounding exists to remove: a 15-word wire item would still be handed a longform-sized
  // token budget and the long-form model path.
  const sourceWords = (effectiveContent || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  const targetLength = effectiveLength(options.length as LengthTier, sourceWords, relatedSources.length + 1)
  if (targetLength !== options.length) {
    console.log(`[rewrite] Source has ~${sourceWords} words — writing "${targetLength}" instead of "${options.length}" rather than padding with invented detail`)
  }

  const prompt = createRewritePrompt(
    originalTitle,
    effectiveContent,
    options,
    customInstructions,
    originalUrl,
    sources,
    targetLength,
    relatedSources.length
  )
  const baseSystemPrompt = options.language === 'en'
    ? `You are a professional journalist who rewrites news articles for a broad audience.

Your task is to rewrite news articles while preserving the core message.

IMPORTANT: You do NOT have access to web browsing or external sources. Work only with the information provided.

CRITICAL — factual accuracy: NEVER invent or guess facts, years, dates, numbers, scores, names, or places that are not in the source text. If the source says "the World Cup" without a year, do NOT add a year. Do not infer the current year. Keep every concrete fact exactly as the source states it; if a detail is missing, leave it out rather than guessing.`
    : options.language === 'de'
    ? `Du bist ein professioneller Journalist, der Nachrichtenartikel für ein breites Publikum umschreibt.

Deine Aufgabe ist es, Nachrichtenartikel umzuschreiben und dabei die Kernbotschaft zu erhalten.

WICHTIG: Du hast KEINEN Zugang zum Internet oder externen Quellen. Arbeite nur mit den bereitgestellten Informationen.

KRITISCH — Faktentreue: Erfinde oder errate NIEMALS Fakten, Jahreszahlen, Daten, Zahlen, Ergebnisse, Namen oder Orte, die nicht im Quelltext stehen. Wenn die Quelle "die WM" ohne Jahr nennt, füge KEIN Jahr hinzu. Leite nicht das aktuelle Jahr ab. Übernimm jede konkrete Tatsache genau so, wie die Quelle sie angibt; fehlt ein Detail, lass es weg, statt zu raten.`
    : `Je bent een professionele journalist die nieuwsartikelen herschrijft voor een breed publiek.

Je taak is om nieuwsartikelen te herschrijven, waarbij je de kernboodschap behoudt.

BELANGRIJK: Je hebt GEEN toegang tot web browsing of externe bronnen. Werk alleen met de informatie die je krijgt.

CRUCIAAL — feitelijke nauwkeurigheid: Verzin of gok NOOIT feiten, jaartallen, datums, cijfers, uitslagen, namen of plaatsen die niet in de brontekst staan. Als de bron "het WK" zegt zonder jaartal, voeg er dan GEEN jaartal aan toe. Leid het huidige jaar niet af. Neem elk concreet feit exact over zoals de bron het stelt; ontbreekt een detail, laat het dan weg in plaats van te gokken.`

  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\nADDITIONAL CONTEXT:\n${customInstructions}`
    : baseSystemPrompt

  const refusalPatterns = [
    /^I('m| am) sorry/im,
    /^I('m| am) unable to/im,
    /^I can'?t (assist|help|fulfill|perform|complete|browse|access)/im,
    /^Unfortunately,? I (cannot|can'?t|am unable)/im,
    /^I (do not|don'?t) have (access|the ability)/im,
    /against my (guidelines|policies|content policy)/i,
    /violates? (my|our|the) (content |usage )?polic/i,
  ]

  const maxTokens = targetLength === 'longform' ? 8000 : targetLength === 'extra-long' ? 4000 : 2000

  // One generation attempt across the whole fallback chain. Wrapped in a function so the
  // figure guard below can ask for a second, corrected draft without duplicating the chain.
  async function generate(systemPrompt: string): Promise<string> {
    // For longform, go directly to Claude (better at long-form content)
    let response = ''
    let usedModel = 'gpt-4o'

    if ((targetLength === 'longform' || targetLength === 'extra-long') && anthropic) {
      console.log(`🔄 Using Claude directly for ${targetLength} content`)
      usedModel = 'claude-sonnet-4-6'
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        })
        response = message.content[0]?.type === 'text' ? message.content[0].text : ''
        if (!response) throw new Error('Claude returned empty response')
        if (refusalPatterns.some(p => p.test(response))) {
          console.warn('⚠️ Claude longform refused, falling back to OpenAI:', originalTitle)
          response = ''
        }
      } catch (claudeError: any) {
        console.error('Claude longform failed, falling back to OpenAI:', claudeError.message)
        // Fall through to OpenAI below
        response = ''
      }
    }

    // Fallback chain: OpenAI → Claude → DeepSeek
    if (!response) {
      try {
        usedModel = 'gpt-4o'
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: maxTokens
        }, { timeout: 90000 })
        response = completion.choices[0]?.message?.content || ''
        if (response && refusalPatterns.some(p => p.test(response))) {
          console.warn('⚠️ OpenAI refused:', originalTitle)
          response = ''
        }
      } catch (e: any) {
        console.error('OpenAI failed:', e.message)
        response = ''
      }

      if (!response && anthropic) {
        try {
          console.log('🔄 Falling back to Claude for:', originalTitle.substring(0, 50))
          usedModel = 'claude-sonnet-4-6'
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
          })
          response = message.content[0]?.type === 'text' ? message.content[0].text : ''
          if (response && refusalPatterns.some(p => p.test(response))) {
            console.warn('⚠️ Claude also refused:', originalTitle)
            response = ''
          }
        } catch (e: any) {
          console.error('Claude failed:', e.message)
          response = ''
        }
      }

      if (!response && deepseek) {
        try {
          console.log('🔄 Falling back to DeepSeek for:', originalTitle.substring(0, 50))
          usedModel = 'deepseek-chat'
          const completion = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens
          }, { timeout: 90000 })
          response = completion.choices[0]?.message?.content || ''
          if (response && refusalPatterns.some(p => p.test(response))) {
            console.warn('⚠️ DeepSeek also refused:', originalTitle)
            response = ''
          }
        } catch (e: any) {
          console.error('DeepSeek failed:', e.message)
          response = ''
        }
      }

      if (!response) {
        throw new Error('All models (OpenAI, Claude, DeepSeek) refused or failed to rewrite this article')
      }
    }

    console.log(`✅ Article rewritten with ${usedModel}: ${originalTitle.substring(0, 50)}...`)
    return response
  }

  // Text a figure may be quoted from: the source material itself plus the operator's own
  // instructions (which legitimately carry the site's own numbers — prices, plan tiers).
  const trustedText = [
    originalTitle,
    effectiveContent,
    ...relatedSources.map(r => `${r.title} ${r.content}`),
    customInstructions || '',
  ].join('\n')

  let parsed = parseRewriteResponse(await generate(systemPrompt), originalTitle, sources, operatorUrls)
  let guard = guardFigures(parsed.content_html, trustedText)

  // A draft built on invented numbers can't be salvaged by deleting them — ask once for a
  // clean draft, naming exactly what it made up, before giving up on the article.
  if (guard.severe) {
    console.warn(
      `⚠️ [figures] "${originalTitle.substring(0, 50)}" invented ${guard.unsupported.length} figure(s) — retrying: ${guard.unsupported.slice(0, 8).join(', ')}`
    )
    const correction = `\n\nYOUR PREVIOUS DRAFT WAS REJECTED. It contained these figures, none of which appear anywhere in the source text: ${guard.unsupported.slice(0, 15).join(', ')}.\nWrite the article again. Use ONLY numbers that appear literally in the source text above. Do not estimate, extrapolate, annualise, convert or round into a new figure, and do not fill a stat block, chart or table with anything the source does not state. If a passage needs a number you do not have, write the passage without one.`
    try {
      const retryResponse = await generate(systemPrompt + correction)
      const retryParsed = parseRewriteResponse(retryResponse, originalTitle, sources, operatorUrls)
      const retryGuard = guardFigures(retryParsed.content_html, trustedText)
      // Keep the retry when it is genuinely cleaner; otherwise stay with the first draft.
      if (retryGuard.unsupported.length < guard.unsupported.length || !retryGuard.severe) {
        parsed = retryParsed
        guard = retryGuard
      }
    } catch (e: any) {
      console.warn('[figures] Retry failed:', e?.message)
    }
  }

  if (guard.severe) {
    throw new Error(
      `Rewrite rejected: article relies on figures that are not in the source (${guard.unsupported.slice(0, 8).join(', ')})`
    )
  }

  if (guard.unsupported.length) {
    console.warn(
      `⚠️ [figures] Removed ${guard.unsupported.length} unsupported figure(s) from "${originalTitle.substring(0, 50)}" (${guard.removedBlocks} block(s), ${guard.removedSentences} sentence(s)): ${guard.unsupported.slice(0, 8).join(', ')}`
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
      console.warn(`⚠️ [figures] Dropped ${faqGuard.dropped} FAQ item(s) built on unsupported figures`)
      parsed.faq = faqGuard.faq
    }
  }

  // Images are placed here, not by the model: it used to be handed a fixed list of Pexels
  // photo IDs, so every article recycled the same stock photos, and it often skipped them
  // entirely. A live search per section heading keeps them varied and on-topic.
  // The prompt tells the model its own images will be discarded — honour that, so a
  // stale hallucinated Pexels ID can never reach a page.
  const strayImages = (parsed.content_html.match(/<figure[\s\S]*?<\/figure>|<img\b[^>]*>/gi) || []).length
  if (strayImages) {
    parsed.content_html = parsed.content_html.replace(/<figure[\s\S]*?<\/figure>/gi, '').replace(/<img\b[^>]*>/gi, '')
    console.log(`[rewrite] Dropped ${strayImages} model-written image(s) in favour of searched images`)
  }

  const imageCount = targetLength === 'longform' || targetLength === 'extra-long' ? 2 : 1
  try {
    parsed.content_html = await injectInlineImages(parsed.content_html, {
      count: imageCount,
      topic: parsed.focus_keyword || parsed.title,
    })
  } catch (e: any) {
    console.warn('[rewrite] Inline image injection failed:', e?.message)
  }

  return parsed
}

/**
 * Parse the model's TITLE / SUBTITLE / SEO-header + HTML body + ---FAQ--- envelope into
 * article fields, and hard-strip any citation that isn't on the allowlist. Exported so
 * the longread writer (lib/longread-writer.ts) shares exactly this contract rather than
 * growing a second, drifting copy of it.
 */
export function parseRewriteResponse(
  response: string,
  originalTitle: string,
  sources: SourceLink[] = [],
  extraAllowedUrls: string[] = []
) {
  // Split FAQ section first
  let mainContent = response
  let faq: { question: string; answer: string }[] = []

  const faqSplit = response.split('---FAQ---')
  if (faqSplit.length > 1) {
    mainContent = faqSplit[0].trim()
    const faqText = faqSplit[1].trim()
    const faqMatches = faqText.matchAll(/[QF]:\s*(.+?)\nA:\s*(.+?)(?=\n[QF]:|\n*$)/gs)
    for (const match of faqMatches) {
      faq.push({ question: match[1].trim(), answer: match[2].trim() })
    }
  }

  // Parse title, subtitle, and content from main section. The separator is matched loosely
  // because models write "----" or leave trailing spaces often enough to matter — when the
  // split missed, the entire SEO header used to be rendered as the article's first paragraph.
  const sections = mainContent.split(/^[ \t]*-{3,}[ \t]*$/m)
  let headerPart = sections[0]?.trim() || ''
  let content = sections.slice(1).join('\n---\n').replace(/^CONTENT:\s*/i, '').trim()

  // Extract title, subtitle, category, and SEO fields from header
  let title = originalTitle
  let subtitle = ''
  let category = ''
  let focus_keyword = ''
  let meta_description = ''
  let seo_keywords: string[] = []

  /**
   * Consume `LABEL: value` lines into the SEO fields and return what's left. Run over the
   * header, and again over anything before the article's first HTML tag, so a header the
   * model put on the wrong side of the separator is still captured rather than published
   * as body copy. Labels that ran together on one line are split apart first.
   */
  function absorbMetaLines(text: string): string {
    const normalised = text.replace(
      /(?!^)[ \t]*\b(SUBTITLE|CATEGORY|FOCUS_KEYWORD|META_DESCRIPTION|SEO_KEYWORDS|CONTENT)\s*:/gi,
      '\n$1:'
    )
    const kept: string[] = []
    for (const line of normalised.split('\n')) {
      const m = line.match(/^\s*(SUBTITLE|CATEGORY|FOCUS_KEYWORD|META_DESCRIPTION|SEO_KEYWORDS|CONTENT)\s*:\s*(.*)$/i)
      if (!m) {
        kept.push(line)
        continue
      }
      const value = m[2].trim()
      switch (m[1].toUpperCase()) {
        case 'SUBTITLE': subtitle ||= value; break
        case 'CATEGORY': category ||= value; break
        case 'FOCUS_KEYWORD': focus_keyword ||= value; break
        case 'META_DESCRIPTION': meta_description ||= value; break
        case 'SEO_KEYWORDS':
          if (!seo_keywords.length) seo_keywords = value.split(',').map(k => k.trim()).filter(Boolean)
          break
        case 'CONTENT': if (value) kept.push(value); break
      }
    }
    return kept.join('\n').trim()
  }

  const headerRest = absorbMetaLines(headerPart)
  const headerLines = headerRest.split('\n').filter(l => l.trim())
  if (headerLines.length >= 1) {
    title = headerLines[0].replace(/^(TITEL|Titel|TITLE|Title):\s*/i, '').trim()
  }

  // If no --- separator was found, the whole response is one block: first line is the title
  // and the rest is the body, with the SEO lines pulled out of it.
  if (sections.length === 1) {
    const lines = headerRest.split('\n')
    const firstLine = lines[0]?.replace(/^(TITEL|Titel|TITLE|Title):\s*/i, '').trim()
    if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
      title = firstLine
      content = lines.slice(1).join('\n').trim()
    }
  }

  // A header written after the separator ends up at the top of the body — strip it there
  // too, but only from the preamble before the first HTML tag, so body prose is untouched.
  const firstTag = content.indexOf('<')
  if (firstTag !== 0) {
    const preamble = firstTag > 0 ? content.slice(0, firstTag) : content
    if (/\b(SUBTITLE|CATEGORY|FOCUS_KEYWORD|META_DESCRIPTION|SEO_KEYWORDS)\s*:/i.test(preamble)) {
      const cleanedPreamble = absorbMetaLines(preamble)
      content = (firstTag > 0 ? `${cleanedPreamble}\n${content.slice(firstTag)}` : cleanedPreamble).trim()
    }
  }

  let content_html: string

  if (content.includes('<p>') || content.includes('<h2>') || content.includes('<section')) {
    content_html = content
    content = content
      .replace(/<section[^>]*>/g, '')
      .replace(/<\/section>/g, '\n\n')
      .replace(/<h[1-6][^>]*>/g, '\n\n')
      .replace(/<\/h[1-6]>/g, '\n')
      .replace(/<p[^>]*>/g, '\n')
      .replace(/<\/p>/g, '')
      .replace(/<li[^>]*>/g, '• ')
      .replace(/<\/li>/g, '\n')
      .replace(/<ul[^>]*>|<\/ul>/g, '\n')
      .replace(/<div[^>]*>|<\/div>/g, '')
      .replace(/<span[^>]*>|<\/span>/g, '')
      .replace(/<strong[^>]*>|<\/strong>/g, '')
      .replace(/<em[^>]*>|<\/em>/g, '')
      .replace(/<a[^>]*>|<\/a>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  } else {
    content_html = generateWordPressHTML(title, content)
  }

  // Hard guarantee against hallucinated citations: whatever the prompt asked for, strip
  // every outbound link the model did not get from a source we actually fetched.
  const { html: linkSafeHtml, removed } = sanitizeArticleLinks(content_html, sources, extraAllowedUrls)
  if (removed.length) {
    console.warn(`⚠️ Removed ${removed.length} hallucinated link(s) from "${originalTitle.substring(0, 50)}": ${removed.slice(0, 5).join(', ')}`)
  }
  content_html = linkSafeHtml

  // Add responsive CSS to make inline-styled elements mobile-friendly
  const responsiveStyles = `<style>
@media(max-width:640px){
figure{margin:1rem 0!important}
figure img{height:auto!important;max-height:250px!important}
div[style*="display:flex"]{flex-direction:column!important}
div[style*="min-width"]{min-width:0!important;width:100%!important}
table{font-size:12px!important;display:block!important;overflow-x:auto!important}
div[style*="gap:1rem"]{gap:0.5rem!important}
}
</style>`
  content_html = responsiveStyles + content_html

  return { title, content, content_html, subtitle, category, faq, focus_keyword: focus_keyword || undefined, meta_description: meta_description || undefined, seo_keywords: seo_keywords.length ? seo_keywords : undefined }
}

/**
 * Build the exact user prompt sent to the model. Exported so the prompt an automation
 * produces can be inspected without spending a generation.
 */
export function createRewritePrompt(
  title: string,
  content: string,
  options: RewriteOptions,
  customInstructions?: string,
  originalUrl?: string,
  sources: SourceLink[] = [],
  /** Tier already rounded down by the caller; recomputed here only for direct callers. */
  scaledLength?: LengthTier,
  /** Number of additional same-story reports folded into `content`, if any. */
  relatedCount = 0
): string {
  const isEnglish = options.language === 'en'
  const isGerman = options.language === 'de'
  const allowedSourcesBlock = buildAllowedSourcesBlock(sources, options.language)

  // Ask only for what the source can carry, and offer data visuals only when there are
  // real figures to put in them.
  const targetLength =
    scaledLength ??
    effectiveLength(
      options.length as LengthTier,
      (content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    )
  const showFigures = hasUsableFigures(content)
  const synthesis = relatedCount > 0 ? synthesisInstructions(options.language, relatedCount + 1) : ''

  const lengthInstructions = {
    short: isEnglish ? 'Keep the text short and concise (200-300 words)' : isGerman ? 'Halte den Text kurz und prägnant (200-300 Wörter)' : 'Houd de tekst kort en bondig (200-300 woorden)',
    medium: isEnglish ? 'Write a medium-length article (400-600 words)' : isGerman ? 'Schreibe einen mittelangen Artikel (400-600 Wörter)' : 'Schrijf een artikel van gemiddelde lengte (400-600 woorden)',
    long: isEnglish ? 'Write an extensive article (700-1000 words)' : isGerman ? 'Schreibe einen ausführlichen Artikel (700-1000 Wörter)' : 'Schrijf een uitgebreid artikel (700-1000 woorden)',
    'extra-long': isEnglish ? 'Write a comprehensive, in-depth article (1200-1500 words). Include detailed analysis, multiple perspectives, and thorough coverage of the topic' : isGerman ? 'Schreibe einen umfassenden, tiefgründigen Artikel (1200-1500 Wörter). Füge detaillierte Analysen, mehrere Perspektiven und gründliche Abdeckung des Themas hinzu' : 'Schrijf een uitgebreid, diepgaand artikel (1200-1500 woorden). Voeg gedetailleerde analyse, meerdere perspectieven en grondige dekking van het onderwerp toe',
    'longform': isEnglish ? 'Write an extensive longform article (2500-3500 words, ~10 minute read). This must be a deeply researched, magazine-quality piece. Include multiple sections with unique headings, expert analysis, real-world examples, historical context, future implications, and at least 4-5 distinct perspectives or angles. Each section should be substantial (300-500 words). Make it the definitive article on this topic.' : isGerman ? 'Schreibe einen ausführlichen Longform-Artikel (2500-3500 Wörter, ~10 Minuten Lesezeit). Dies muss ein tiefgründiges Stück in Magazinqualität sein. Füge mehrere Abschnitte mit einzigartigen Überschriften, Expertenanalysen, Praxisbeispielen, historischem Kontext, Zukunftsperspektiven und mindestens 4-5 verschiedenen Blickwinkeln hinzu. Mache es zum definitiven Artikel zu diesem Thema.' : 'Schrijf een uitgebreid longform artikel (2500-3500 woorden, ~10 minuten leestijd). Dit moet een diepgaand, magazine-kwaliteit stuk zijn. Voeg meerdere secties toe met unieke koppen, expertanalyse, praktijkvoorbeelden, historische context, toekomstperspectieven, en minimaal 4-5 verschillende invalshoeken. Elke sectie moet substantieel zijn (300-500 woorden). Maak het hét definitieve artikel over dit onderwerp.'
  }

  const styleInstructions = {
    professional: isEnglish ? 'Write as a news article for a professional audience - clear, informative and human' : isGerman ? 'Schreibe als Nachrichtenartikel für ein professionelles Publikum - klar, informativ und menschlich' : 'Schrijf als een nieuwsbericht voor een professioneel publiek - helder, informatief en menselijk',
    engaging: isEnglish ? 'Write as an accessible news article that engages readers with story and context' : isGerman ? 'Schreibe als zugänglicher Nachrichtenartikel, der Leser mit Geschichte und Kontext einbindet' : 'Schrijf als een toegankelijk nieuwsbericht dat lezers betrekt met verhaal en context',
    technical: isEnglish ? 'Write as a technical news article with in-depth analysis but understandable explanation' : isGerman ? 'Schreibe als technischer Nachrichtenartikel mit tiefgründiger Analyse aber verständlicher Erklärung' : 'Schrijf als een technisch nieuwsbericht met diepgaande analyse maar begrijpelijke uitleg',
    news: isEnglish ? 'Write as a clear news article in journalistic style - direct, informative and structured like traditional news articles' : isGerman ? 'Schreibe als klarer Nachrichtenartikel im journalistischen Stil - direkt, informativ und strukturiert wie traditionelle Nachrichtenartikel' : 'Schrijf als een helder nieuwsbericht in journalistieke stijl - direct, informatief en gestructureerd zoals traditionele nieuwsartikelen'
  }

  const toneInstructions = {
    neutral: isEnglish ? 'Maintain a neutral, objective tone' : isGerman ? 'Behalte einen neutralen, objektiven Ton bei' : 'Houd een neutrale, objectieve toon aan',
    warning: isEnglish ? 'Emphasize the urgency and potential dangers' : isGerman ? 'Betone die Dringlichkeit und potenzielle Gefahren' : 'Benadruk de urgentie en potentiële gevaren',
    informative: isEnglish ? 'Focus on providing useful information and context' : isGerman ? 'Konzentriere dich auf nützliche Informationen und Kontext' : 'Focus op het verstrekken van nuttige informatie en context'
  }

  const audienceBlock = options.targetAudience
    ? (isEnglish
      ? `\nTARGET AUDIENCE: ${options.targetAudience}\nAdapt your writing style for this audience. Use terminology and references they recognize.\nFocus on aspects that are relevant to their role/interests.\n`
      : isGerman
      ? `\nZIELGRUPPE: ${options.targetAudience}\nPasse deinen Schreibstil dieser Zielgruppe an. Verwende Terminologie und Referenzen, die sie kennen.\nFokussiere auf Aspekte, die für ihre Rolle/Interessen relevant sind.\n`
      : `\nDOELGROEP: ${options.targetAudience}\nPas je schrijfstijl aan op deze doelgroep. Gebruik terminologie en referenties die zij herkennen.\nFocus op aspecten die relevant zijn voor hun rol/interesses.\n`)
    : ''

  if (isGerman) {
    return `
${relatedCount > 0
  ? `Schreibe aus den ${relatedCount + 1} untenstehenden Berichten, die alle dieselbe Nachricht behandeln, EINEN originellen Artikel für ein deutschsprachiges Publikum:`
  : 'Schreibe den folgenden Nachrichtenartikel für ein deutschsprachiges Publikum um:'}

ORIGINALTITEL: ${title}
ORIGINALINHALT: ${content}
${originalUrl ? `ORIGINAL-URL: ${originalUrl}` : ''}
${audienceBlock}
ANWEISUNGEN:
${synthesis}
SCHRITT 1 - UMSCHREIBEN:
- ${styleInstructions[options.style]}
- ${lengthInstructions[targetLength]}
- ${toneInstructions[options.tone]}
- Schreibe auf Deutsch als Nachrichtenartikel/Pressemitteilung
- Behalte die Kernbotschaft bei und bereichere mit Kontext wo möglich
- EIGENSTÄNDIGE NEUFASSUNG (entscheidend): Dies muss ein origineller Text sein, keine leicht bearbeitete Kopie. Ordne das Material in deine eigene Struktur, formuliere jeden Satz neu und beginne mit dem Aspekt, der für dieses Publikum am wichtigsten ist. Übernimm NICHT die Formulierungen, die Satzreihenfolge oder die Überschriften der Quelle.
- LÄNGE: Der angegebene Bereich ist bereits auf den Umfang dieser Quelle abgestimmt. Schöpfe ihn voll aus, solange du aus dem schöpfst, was in der Quelle steht — lass nichts ungenutzt. Müsstest du etwas erfinden, um den Bereich zu erreichen, höre stattdessen früher auf: ein präziser Artikel schlägt immer einen aufgeblähten.
- Du DARFST ergänzen: Erklärung von Fachbegriffen, warum das für den Leser relevant ist, wie die Teile der Quelle zusammenhängen, und was sie aussagt und was nicht. Du DARFST NICHT ergänzen: Zahlen, Daten, Geschäftszahlen, Zitate, namentliche Experten, Studien, Marktgrößen oder Prognosen, die nicht im Quelltext stehen. Wenn du nach einer Statistik greifst, um Platz zu füllen, lass sie weg und schreibe kürzer.
- Schreibe niemals Floskeln wie "Experten sagen", "Studien zeigen" oder "Analysten erwarten", sofern die Quelle diesen Experten, diese Studie oder diesen Analysten nicht benennt.
- ORIGINALE ÜBERSCHRIFTEN: Erstelle einzigartige Überschriften basierend auf dem tatsächlichen Inhalt
- ZITATE: Wenn Personen erwähnt werden, generiere 1 relevantes Zitat basierend auf dem Kontext
- Vermeide Unternehmens-Jargon
- Mache es informativ aber lesbar für ein breites Publikum
${customInstructions ? `\nSCHRITT 1B - ZUSÄTZLICHE ANWEISUNGEN:\n${customInstructions}\n` : ''}
SCHRITT 2 - QUELLEN (KRITISCH):
- Verlinke jede Quelle aus der untenstehenden Liste, die für deinen Text relevant ist — und keine andere
- Verknüpfe Quellen natürlich im Text; eine Quelle im Fließtext zu nennen erfordert keinen Link
${allowedSourcesBlock}

SCHRITT 3 - VISUELLE ELEMENTE:
Füge KEINE Bilder ein. Bilder werden nach dir automatisch aus einer echten Bildsuche ergänzt — jedes <img> oder <figure>, das du selbst schreibst, wird verworfen.
${showFigures ? `
Die Quelle enthält echte Zahlen. Füge GENAU EIN Datenelement ein, das ausschließlich aus Zahlen des obigen Quelltextes besteht. Runde, extrapoliere oder erfinde niemals einen Wert, um es zu vervollständigen:
- DATENTABELLE: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px">
- KERNZAHLEN: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> mit Statistikkarten

Lässt es sich nicht allein aus der Quelle füllen, lass es ganz weg.` : `
Die Quelle enthält keine verwertbaren Zahlen. Füge KEINE Statistikblöcke, Diagramme oder Datentabellen ein — es gibt nichts Belegbares hineinzuschreiben, und Zahlen zu erfinden, um eine Vorlage zu füllen, ist ein schwerer Fehler. Gliedere den Artikel stattdessen mit klaren <h2>-Überschriften.`}

SCHRITT 4 - SEO-OPTIMIERUNG (KRITISCH):
- Bestimme ein FOCUS KEYWORD: eine Suchphrase aus 2-4 Wörtern, die Menschen bei Google eingeben würden, um diesen Artikel zu finden (z.B. "Netflix Kinder Spiele App", "KI Marketing Automatisierung"). Denke an Suchintention und Volumen.
- Schreibe eine überzeugende META DESCRIPTION (140-155 Zeichen) mit dem Focus Keyword, die Klicks aus Suchergebnissen fördert.
- Identifiziere 5-8 SEO KEYWORDS: verwandte Suchbegriffe und Long-Tail-Variationen.
- Verwebe das Focus Keyword NATÜRLICH in: den Titel, den ersten Absatz, mindestens eine <h2>-Überschrift, und 2-3 weitere Male im Artikel. KEIN Keyword-Stuffing — natürlich und lesbar halten.
- Strukturiere Überschriften (<h2>) als Fragen oder beschreibende Phrasen, nach denen Menschen tatsächlich suchen.

KRITISCHE ANWEISUNGEN:
1. KEIN DATUM: Kein Veröffentlichungsdatum im Artikel
2. ORIGINALE ÜBERSCHRIFTEN: Einzigartige Überschriften basierend auf tatsächlichem Inhalt
3. KEIN META: Keine "CHECK:" oder Review-Anweisungen in der Ausgabe
4. VISUELLE ELEMENTE: Schreibe gar keine Bilder — sie werden anschließend automatisch ergänzt${showFigures ? '. Füge ein Datenelement ein, ausschließlich mit Zahlen aus der Quelle' : '; keine Statistikblöcke, Diagramme oder Tabellen, da die Quelle keine Zahlen enthält'}
5. LÄNGE UND REDLICHKEIT: Erfinde niemals Details, um eine Länge zu erreichen — arbeite aber alles durch, was die Quelle hergibt. Eine gehaltvolle Quelle verdient einen vollständigen Artikel im angegebenen Bereich; nur eine dünne Quelle ergibt einen kurzen
5. SEO: Focus Keyword muss im Titel, ersten Absatz und mindestens einer h2 vorkommen. Meta Description muss 140-155 Zeichen lang sein.

FORMATIERE DEINE ANTWORT WIE FOLGT:
[Kraftvoller deutscher Titel mit Focus Keyword OHNE "TITEL:" davor]
SUBTITLE: [Einzeiliger Untertitel der Kontext oder Blickwinkel zum Titel hinzufügt]
CATEGORY: [Ein oder zwei Wörter als Themen-Label, z.B. "KI Sicherheit", "Marketing", "Cybersicherheit"]
FOCUS_KEYWORD: [Die primäre Suchphrase aus 2-4 Wörtern für diesen Artikel]
META_DESCRIPTION: [140-155 Zeichen überzeugende Beschreibung für Suchmaschinen, enthält Focus Keyword]
SEO_KEYWORDS: [5-8 komma-getrennte verwandte Suchbegriffe]
---
<section class="content-section" id="[slug-der-überschrift]">
<h2>[Originale Überschrift basierend auf Inhalt]</h2>
<p>[Eröffnungsabsatz - KEIN Datum oder Standort-Prefix]</p>
</section>

<section class="content-section" id="quellen">
<h2>Quellen</h2>
<ul>
<li><a href="${originalUrl || '[URL]'}" target="_blank" rel="noopener noreferrer">[Plattformname]</a></li>
</ul>
</section>

---FAQ---
F: [Häufig gestellte Frage zum Thema]
A: [Prägnante Antwort in 2-3 Sätzen]

F: [Weitere Frage]
A: [Antwort]

F: [Weitere Frage]
A: [Antwort]

F: [Weitere Frage]
A: [Antwort]

F: [Weitere Frage]
A: [Antwort]

WICHTIGE FORMATIERUNGSREGELN:
- Jeder Abschnitt MUSS in <section class="content-section" id="[slug]"> eingeschlossen sein
- Verwende <h2> für Abschnittsüberschriften, NICHT <p><strong>
- Generiere genau 5 FAQ-Elemente nach dem ---FAQ--- Separator

Beginne jetzt mit dem Umschreiben:
`
  }

  if (isEnglish) {
    return `
${relatedCount > 0
  ? `Write one original news article for an English-speaking audience from the ${relatedCount + 1} reports below, which all cover the same story:`
  : 'Rewrite the following news article for an English-speaking audience:'}

ORIGINAL TITLE: ${title}
ORIGINAL CONTENT: ${content}
${originalUrl ? `ORIGINAL URL: ${originalUrl}` : ''}
${audienceBlock}
INSTRUCTIONS:
${synthesis}
STEP 1 - REWRITING:
- ${styleInstructions[options.style]}
- ${lengthInstructions[targetLength]}
- ${toneInstructions[options.tone]}
- Write in English as a news article/press release
- Maintain the core message and enrich with context where possible
- UNIQUE REWRITE (essential): this must be an original piece of writing, not a lightly edited copy. Reorganise the material into your own structure, write every sentence in your own words, and lead with the angle that matters most to this audience. Do NOT reuse the source's phrasing, sentence order or headings.
- LENGTH: the range given has already been matched to the size of this source. Use it fully as long as you are drawing on what the source actually contains — do not leave material unused. If you find you would have to invent something to reach the range, stop earlier instead: a tight, accurate article always beats a padded one.
- You may add: explanation of terms, why this matters to the reader, how the parts of the source connect, and what it does and does not tell us. You may NOT add: figures, dates, company results, quotes, named experts, studies, market sizes or forecasts that are not in the source text. If you find yourself reaching for a statistic to fill space, leave it out and write less.
- Never write filler such as "experts say", "studies show" or "analysts expect" unless the source names that expert, study or analyst.
- ORIGINAL HEADINGS: Create unique headings based on actual content - NEVER standard formulas
- QUOTES: If people are mentioned, generate 1 relevant quote based on context
- Avoid corporate jargon like 'Executive Summary' or 'Business Impact'
- Make it informative but readable for a broad audience
- Add relevant context for English readers
${customInstructions ? `\nSTEP 1B - EXTRA INSTRUCTIONS:\n${customInstructions}\n` : ''}
STEP 2 - SOURCES (CRITICAL):
- Link to every source on the allowed list below that is relevant to what you write, and to no others
- Weave source references naturally into the article text (e.g., "According to a Gartner report..." or "Research published in Nature...") — naming a source in prose needs no link
- Also list the sources you linked at the end in the Sources section with clickable HTML links
${allowedSourcesBlock}

STEP 3 - VISUAL ELEMENTS:
Do NOT insert any images. Images are added automatically after you finish, from a real image search — any <img> or <figure> you write yourself will be discarded.
${showFigures ? `
The source contains real figures, so include ONE data element built ONLY from numbers that appear in the source text above. Never round, extrapolate or invent a value to complete it:

- DATA TABLE: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:10px 14px;border-bottom:2px solid #e2e8f0;font-weight:600">Header</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px 14px">Data</td></tr></tbody></table>
- KEY STATS BLOCK: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> with stat cards: <div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;text-align:center"><span style="display:block;font-size:28px;font-weight:700;color:#4f46e5">[figure from the source]</span><span style="font-size:13px;color:#64748b">[what it measures]</span></div>
- CSS BAR CHART, only for figures that are genuinely comparable:
  <div style="margin:1.5rem 0"><div style="display:flex;align-items:center;margin-bottom:8px"><span style="width:120px;font-size:13px;color:#374151">Label</span><div style="flex:1;background:#e2e8f0;border-radius:4px;height:24px"><div style="width:[actual proportion]%;background:#4f46e5;border-radius:4px;height:24px;display:flex;align-items:center;padding-left:8px"><span style="font-size:12px;color:white;font-weight:600">[value]</span></div></div></div></div>

If you cannot fill the element from the source alone, omit it entirely.` : `
The source contains no usable figures. Do NOT include stat blocks, charts or data tables — there is nothing factual to put in them, and inventing numbers to fill a template is a serious error. Structure the article with clear <h2> headings and, where it genuinely helps, a bulleted list of points taken from the source.`}

STEP 4 - SEO OPTIMIZATION (CRITICAL):
- Determine a FOCUS KEYWORD: a 2-4 word search phrase that people would Google to find this article (e.g. "Netflix kids games app", "AI marketing automation tools"). Think about search intent and volume.
- Write a compelling META DESCRIPTION (140-155 characters) that includes the focus keyword and encourages clicks from search results.
- Identify 5-8 SEO KEYWORDS: related search terms and long-tail variations that support the focus keyword.
- NATURALLY weave the focus keyword into: the title, the first paragraph, at least one <h2> heading, and 2-3 more times throughout the article. Do NOT keyword-stuff — keep it natural and readable.
- Use SEO keywords as variations throughout the article to cover semantic search.
- Structure headings (<h2>) as questions or descriptive phrases people actually search for.

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. NO DATE: Do NOT include any publication date in the article - the CMS handles dates
2. ORIGINAL HEADINGS: Create unique headings based on actual content
3. QUOTES: If people are mentioned, generate 1-2 relevant quotes
4. LINKS: Integrate subtly in the text, no "Source:" labels
5. NO META INSTRUCTIONS: Do NOT include any "CHECK:" or review instructions in the output
6. VISUAL ELEMENTS: write no images at all — they are added automatically afterwards${showFigures ? '. Include one data element, filled only with figures from the source' : ', and include no stat blocks, charts or tables since the source has no figures'}
7. LENGTH AND HONESTY: never invent detail to reach a length — but do work through everything the source offers. A substantial source deserves a full article within the given range; only a thin source produces a short one
8. SOURCES: Link ONLY to URLs on the allowed-sources list. Never invent, guess or complete a URL. Fewer links is always better than one fabricated link
9. SEO: Focus keyword must appear in title, first paragraph, and at least one h2. Meta description must be 140-155 characters.

FORMAT YOUR ANSWER AS FOLLOWS:
[Powerful English title that includes the focus keyword WITHOUT "TITLE:" before it]
SUBTITLE: [One-line subtitle that adds context or angle to the title]
CATEGORY: [One or two word topic label for this article, e.g. "AI Security", "SEO", "Marketing", "Cybersecurity", "Enterprise AI", "Data Privacy". Be specific to the article content.]
FOCUS_KEYWORD: [The primary 2-4 word search phrase for this article]
META_DESCRIPTION: [140-155 character compelling description for search engines, includes focus keyword]
SEO_KEYWORDS: [5-8 comma-separated related search terms]
---
<section class="content-section" id="[slug-of-heading]">
<h2>[Original heading based on content]</h2>
<p>[Opening paragraph - do NOT include a date or location prefix]</p>
<p>[More paragraphs, lists, quotes as needed]</p>
</section>

<section class="content-section" id="[slug-of-heading]">
<h2>[Next heading]</h2>
<p>[Content for this section]</p>
</section>

<section class="content-section" id="sources">
<h2>Sources</h2>
<ul>
<li><a href="${originalUrl || '[URL]'}" target="_blank" rel="noopener noreferrer">[Platform name]</a></li>
</ul>
</section>

---FAQ---
Q: [Frequently asked question about the topic]
A: [Concise answer in 2-3 sentences]

Q: [Another question]
A: [Answer]

Q: [Another question]
A: [Answer]

Q: [Another question]
A: [Answer]

Q: [Another question]
A: [Answer]

IMPORTANT FORMATTING RULES:
- Each content section MUST be wrapped in <section class="content-section" id="[slug]">
- Use <h2> for section headings, NOT <p><strong>
- Use <div class="quote-callout"><p>"Quote text"</p><span class="quote-source">— Source name</span></div> for quotes
- Generate exactly 5 FAQ items after the ---FAQ--- separator
- The SUBTITLE line must appear right after the title, before the --- separator
- Do NOT include any date, location prefix, or "CHECK:" instructions
- Include at least 1 visual element (table, stat block, or comparison)

Start rewriting now:
`
  }

  return `
${relatedCount > 0
  ? `Schrijf één origineel nieuwsartikel voor een Nederlandse doelgroep op basis van de ${relatedCount + 1} onderstaande berichten, die allemaal over hetzelfde nieuwsfeit gaan:`
  : 'Herschrijf het volgende nieuwsartikel voor een Nederlandse doelgroep:'}

ORIGINELE TITEL: ${title}
ORIGINELE CONTENT: ${content}
${originalUrl ? `ORIGINELE URL: ${originalUrl}` : ''}
${audienceBlock}
INSTRUCTIES:
${synthesis}
STAP 1 - HERSCHRIJVEN:
- ${styleInstructions[options.style]}
- ${lengthInstructions[targetLength]}
- ${toneInstructions[options.tone]}
- Schrijf in het Nederlands als een nieuwsbericht/persbericht
- Behoud de kernboodschap en verrijk met context waar mogelijk
- UNIEK HERSCHRIJVEN (essentieel): dit moet een origineel stuk zijn, geen licht geredigeerde kopie. Herorden het materiaal in je eigen structuur, formuleer elke zin opnieuw, en begin met de invalshoek die voor deze doelgroep het meest telt. Neem NIET de formuleringen, zinsvolgorde of koppen van de bron over.
- LENGTE: het opgegeven bereik is al afgestemd op de omvang van deze bron. Benut het volledig zolang je put uit wat er in de bron staat — laat niets liggen wat de bron wél biedt. Merk je dat je zou moeten verzinnen om het bereik te halen, stop dan eerder: een strak, kloppend artikel is altijd beter dan een opgerekt artikel.
- Je MAG toevoegen: uitleg van vaktermen, waarom dit ertoe doet voor de lezer, hoe de onderdelen van de bron samenhangen, en wat de bron wel en niet zegt. Je MAG NIET toevoegen: cijfers, datums, bedrijfsresultaten, quotes, met naam genoemde experts, onderzoeken, marktomvang of voorspellingen die niet in de brontekst staan. Grijp je naar een statistiek om ruimte te vullen, laat hem dan weg en schrijf korter.
- Schrijf nooit vulzinnen als "experts zeggen", "onderzoek toont aan" of "analisten verwachten", tenzij de bron die expert, dat onderzoek of die analist bij naam noemt.
- ORIGINELE KOPPEN: Creëer unieke koppen op basis van de werkelijke inhoud - NOOIT standaard formules
- QUOTES: Als er personen worden genoemd, genereer 1 relevante quote gebaseerd op de context
- Vermijd corporate jargon zoals 'Executive Summary' of 'Business Impact'
- Gebruik specifieke, contextgerelateerde koppen (bijv. "Microsoft patch lost Exchange kwetsbaarheid op")
- Maak het informatief maar leesbaar voor een breed publiek
- Voeg relevante context toe voor Nederlandse lezers
${customInstructions ? `\nSTAP 1B - EXTRA INSTRUCTIES:\n${customInstructions}\n` : ''}
STAP 2 - BRONNEN:
- Link naar elke bron uit onderstaande lijst die relevant is voor wat je schrijft, en naar geen enkele andere
- Verwerk bronvermeldingen natuurlijk in de tekst; een bron bij naam noemen hoeft geen link te zijn
- Voeg aan het einde een bronnenlijst toe als klikbare HTML links
${allowedSourcesBlock}

STAP 3 - VISUELE ELEMENTEN:
Voeg GEEN afbeeldingen toe. Beelden worden na jou automatisch toegevoegd op basis van een echte beeldzoekopdracht — elke <img> of <figure> die je zelf schrijft wordt weggegooid.
${showFigures ? `
De bron bevat echte cijfers. Voeg PRECIES ÉÉN data-element toe, uitsluitend opgebouwd uit cijfers die in de brontekst hierboven staan. Rond nooit af, extrapoleer niet en verzin geen waarde om het compleet te maken:
- DATATABEL: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"> met <thead>, <tbody> en inline styling
- VERGELIJKING: een tweekolomstabel, alleen als de bron beide kanten beschrijft
- KERNCIJFERS: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> met statblokken (groot cijfer uit de bron + wat het meet)
- TIJDLIJN: een genummerde lijst met vetgedrukte datums die in de bron staan

Lukt het niet om het alleen uit de bron te vullen, laat het dan helemaal weg.` : `
De bron bevat geen bruikbare cijfers. Voeg GEEN statblokken, grafieken of datatabellen toe — er is niets feitelijks om erin te zetten, en cijfers verzinnen om een sjabloon te vullen is een ernstige fout. Structureer het artikel in plaats daarvan met heldere <h2>-koppen, en gebruik alleen een opsomming als die punten letterlijk uit de bron komen.`}

STAP 4 - SEO OPTIMALISATIE (KRITIEK):
- Bepaal een FOCUS KEYWORD: een zoekterm van 2-4 woorden die mensen zouden Googlen om dit artikel te vinden (bijv. "Netflix kids games app", "AI marketing automation tools"). Denk na over zoekintentie en volume. Gebruik de taal van de doelgroep (Engels is prima voor vakjargon).
- Schrijf een pakkende META DESCRIPTION (140-155 tekens) die het focus keyword bevat en kliks aanmoedigt vanuit zoekresultaten.
- Identificeer 5-8 SEO KEYWORDS: gerelateerde zoektermen en long-tail variaties die het focus keyword ondersteunen.
- Verwerk het focus keyword NATUURLIJK in: de titel, de eerste paragraaf, minimaal één <h2> kop, en 2-3 keer meer door het artikel. NIET keyword-stuffing — houd het natuurlijk en leesbaar.
- Gebruik SEO keywords als variaties door het artikel heen voor semantisch zoeken.
- Structureer koppen (<h2>) als vragen of beschrijvende zinnen waar mensen daadwerkelijk naar zoeken.

KRITIEKE INSTRUCTIES - LEES ZORGVULDIG:

1. GEEN DATUM: Voeg GEEN publicatiedatum toe aan het artikel - het CMS regelt datums
2. ORIGINELE KOPPEN: Creëer unieke koppen op basis van werkelijke inhoud
3. QUOTES: Als er personen worden genoemd, genereer 1 relevante quote
4. LINKS: Verwerk subtiel in de tekst, geen "Bron:" labels
5. GEEN META INSTRUCTIES: Voeg GEEN "CONTROLEER:" of review instructies toe aan de output
6. VISUELE ELEMENTEN: schrijf zelf geen afbeeldingen — die worden na afloop automatisch toegevoegd${showFigures ? '. Voeg één data-element toe, uitsluitend gevuld met cijfers uit de bron' : '; geen statblokken, grafieken of tabellen, want de bron bevat geen cijfers'}
7. LENGTE EN EERLIJKHEID: verzin nooit details om een lengte te halen — maar verwerk wél alles wat de bron te bieden heeft. Een bron met veel inhoud verdient een volledig artikel binnen het opgegeven bereik; alleen een dunne bron levert een kort artikel op
7. SEO: Focus keyword moet in titel, eerste paragraaf, en minimaal één h2 staan. Meta description moet 140-155 tekens zijn.

FORMAT JE ANTWOORD ALS VOLGT:
[Krachtige Nederlandse titel met het focus keyword erin ZONDER "TITEL:" ervoor]
SUBTITLE: [Eenregelige ondertitel die context of invalshoek toevoegt aan de titel]
CATEGORY: [Een of twee woorden als onderwerp-label voor dit artikel, bijv. "AI Security", "SEO", "Marketing", "Cybersecurity", "Enterprise AI", "Data Privacy". Wees specifiek voor de inhoud van het artikel.]
FOCUS_KEYWORD: [De primaire zoekterm van 2-4 woorden voor dit artikel]
META_DESCRIPTION: [140-155 tekens pakkende beschrijving voor zoekmachines, bevat focus keyword]
SEO_KEYWORDS: [5-8 komma-gescheiden gerelateerde zoektermen]
---
<section class="content-section" id="[slug-van-kop]">
<h2>[Origineel kopje gebaseerd op inhoud]</h2>
<p>[Openingsparagraaf - begin NIET met een datum of locatie prefix]</p>
<p>[Meer paragrafen, lijsten, quotes waar nodig]</p>
</section>

<section class="content-section" id="[slug-van-kop]">
<h2>[Volgende kop]</h2>
<p>[Inhoud voor deze sectie]</p>
</section>

<section class="content-section" id="sources">
<h2>Bronnen</h2>
<ul>
<li><a href="${originalUrl || '[URL]'}" target="_blank" rel="noopener noreferrer">[Platform naam]</a></li>
</ul>
</section>

---FAQ---
Q: [Veelgestelde vraag over het onderwerp]
A: [Beknopt antwoord in 2-3 zinnen]

Q: [Andere vraag]
A: [Antwoord]

Q: [Andere vraag]
A: [Antwoord]

Q: [Andere vraag]
A: [Antwoord]

Q: [Andere vraag]
A: [Antwoord]

BELANGRIJKE OPMAAKREGELS:
- Elke sectie MOET gewrapt zijn in <section class="content-section" id="[slug]">
- Gebruik <h2> voor sectiekoppen, NIET <p><strong>
- Gebruik <div class="quote-callout"><p>"Quote tekst"</p><span class="quote-source">— Bron naam</span></div> voor quotes
- Genereer precies 5 FAQ items na de ---FAQ--- separator
- De SUBTITLE regel moet direct na de titel staan, vóór de --- separator
- Voeg GEEN datum, locatie prefix, of "CONTROLEER:" instructies toe

Begin nu met het herschrijven:
`
}

function generateWordPressHTML(title: string, content: string): string {
  // Convert plain text to WordPress-ready HTML
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  
  let html = `<h1>${title}</h1>\n\n`
  
  paragraphs.forEach(paragraph => {
    const trimmed = paragraph.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      // Handle bullet points
      const items = trimmed.split('\n').filter(item => item.trim())
      html += '<ul>\n'
      items.forEach(item => {
        const cleanItem = item.replace(/^[-•]\s*/, '').trim()
        html += `  <li>${cleanItem}</li>\n`
      })
      html += '</ul>\n\n'
    } else if (trimmed.includes(':') && trimmed.split(':')[0].length < 50) {
      // Handle subheadings
      const parts = trimmed.split(':', 2)
      if (parts.length === 2) {
        html += `<h3>${parts[0].trim()}</h3>\n<p>${parts[1].trim()}</p>\n\n`
      } else {
        html += `<p>${trimmed}</p>\n\n`
      }
    } else {
      // Regular paragraph
      html += `<p>${trimmed}</p>\n\n`
    }
  })
  
  return html.trim()
}