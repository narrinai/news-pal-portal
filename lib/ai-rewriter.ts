import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export interface RewriteOptions {
  style: 'professional' | 'engaging' | 'technical' | 'news'
  length: 'short' | 'medium' | 'long' | 'extra-long' | 'longform'
  language: 'nl' | 'en'
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
  originalUrl?: string
): Promise<{ title: string; content: string; content_html: string; subtitle?: string; faq?: { question: string; answer: string }[] }> {
  const prompt = createRewritePrompt(originalTitle, originalContent, options, customInstructions, originalUrl)
  const baseSystemPrompt = options.language === 'en'
    ? `You are a professional journalist who rewrites news articles for a broad audience.

Your task is to rewrite news articles while preserving the core message.

IMPORTANT: You do NOT have access to web browsing or external sources. Work only with the information provided.`
    : `Je bent een professionele journalist die nieuwsartikelen herschrijft voor een breed publiek.

Je taak is om nieuwsartikelen te herschrijven, waarbij je de kernboodschap behoudt.

BELANGRIJK: Je hebt GEEN toegang tot web browsing of externe bronnen. Werk alleen met de informatie die je krijgt.`

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

  // For longform, go directly to Claude (better at long-form content)
  let response = ''
  let usedModel = 'gpt-4o'
  const maxTokens = options.length === 'longform' ? 8000 : options.length === 'extra-long' ? 4000 : 2000

  if ((options.length === 'longform' || options.length === 'extra-long') && anthropic) {
    console.log(`🔄 Using Claude directly for ${options.length} content`)
    usedModel = 'claude-sonnet-4-20250514'
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })
      response = message.content[0]?.type === 'text' ? message.content[0].text : ''
      if (!response) throw new Error('Claude returned empty response')
    } catch (claudeError: any) {
      console.error('Claude longform failed, falling back to OpenAI:', claudeError.message)
      // Fall through to OpenAI below
      response = ''
    }
  }

  if (!response) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    }, {
      timeout: 90000
    })

    response = completion.choices[0]?.message?.content || ''

    if (refusalPatterns.some(p => p.test(response))) {
      console.warn('⚠️ OpenAI refused, falling back to Claude:', originalTitle)
      throw new Error('AI_REFUSAL')
    }
  } catch (openaiError: any) {
    // Fallback to Claude
    if (!anthropic) {
      console.error('OpenAI failed and no ANTHROPIC_API_KEY configured')
      throw new Error('Failed to rewrite article: OpenAI refused and Claude fallback not available')
    }

    console.log('🔄 Falling back to Claude for:', originalTitle)
    usedModel = 'claude-sonnet-4-20250514'

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      })

      response = message.content[0]?.type === 'text' ? message.content[0].text : ''

      if (!response) {
        throw new Error('Claude returned empty response')
      }
    } catch (claudeError: any) {
      console.error('Claude fallback also failed:', claudeError.message)
      throw new Error('Failed to rewrite article with both OpenAI and Claude')
    }
  }
  } // end if (!response)

  console.log(`✅ Article rewritten with ${usedModel}: ${originalTitle.substring(0, 50)}...`)

  // Parse the response to extract title and content
  return parseRewriteResponse(response, originalTitle)
}

function parseRewriteResponse(response: string, originalTitle: string) {
  // Split FAQ section first
  let mainContent = response
  let faq: { question: string; answer: string }[] = []

  const faqSplit = response.split('---FAQ---')
  if (faqSplit.length > 1) {
    mainContent = faqSplit[0].trim()
    const faqText = faqSplit[1].trim()
    const faqMatches = faqText.matchAll(/Q:\s*(.+?)\nA:\s*(.+?)(?=\nQ:|\n*$)/gs)
    for (const match of faqMatches) {
      faq.push({ question: match[1].trim(), answer: match[2].trim() })
    }
  }

  // Parse title, subtitle, and content from main section
  const sections = mainContent.split(/^---$/m)
  let headerPart = sections[0]?.trim() || ''
  let content = sections[1]?.replace(/^CONTENT:\s*/i, '').trim() || (sections.length === 1 ? '' : '')

  // Extract title and subtitle from header
  let title = originalTitle
  let subtitle = ''

  const headerLines = headerPart.split('\n').filter(l => l.trim())
  if (headerLines.length >= 1) {
    title = headerLines[0].replace(/^(TITEL|Titel|TITLE|Title):\s*/i, '').trim()
  }
  for (const line of headerLines) {
    const subMatch = line.match(/^SUBTITLE:\s*(.+)/i)
    if (subMatch) {
      subtitle = subMatch[1].trim()
    }
  }

  // If no --- separator found, try first line as title
  if (sections.length === 1) {
    const lines = mainContent.split('\n')
    const firstLine = lines[0]?.replace(/^(TITEL|Titel|TITLE|Title):\s*/i, '').trim()
    if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
      title = firstLine
      // Find content start (skip title and subtitle lines)
      let startIdx = 1
      if (lines[1]?.match(/^SUBTITLE:/i)) startIdx = 2
      content = lines.slice(startIdx).join('\n').replace(/^CONTENT:\s*/i, '').trim()
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

  return { title, content, content_html, subtitle, faq }
}

function createRewritePrompt(
  title: string,
  content: string,
  options: RewriteOptions,
  customInstructions?: string,
  originalUrl?: string
): string {
  const isEnglish = options.language === 'en'

  const lengthInstructions = {
    short: isEnglish ? 'Keep the text short and concise (200-300 words)' : 'Houd de tekst kort en bondig (200-300 woorden)',
    medium: isEnglish ? 'Write a medium-length article (400-600 words)' : 'Schrijf een artikel van gemiddelde lengte (400-600 woorden)',
    long: isEnglish ? 'Write an extensive article (700-1000 words)' : 'Schrijf een uitgebreid artikel (700-1000 woorden)',
    'extra-long': isEnglish ? 'Write a comprehensive, in-depth article (1200-1500 words). Include detailed analysis, multiple perspectives, and thorough coverage of the topic' : 'Schrijf een uitgebreid, diepgaand artikel (1200-1500 woorden). Voeg gedetailleerde analyse, meerdere perspectieven en grondige dekking van het onderwerp toe',
    'longform': isEnglish ? 'Write an extensive longform article (2500-3500 words, ~10 minute read). This must be a deeply researched, magazine-quality piece. Include multiple sections with unique headings, expert analysis, real-world examples, historical context, future implications, and at least 4-5 distinct perspectives or angles. Each section should be substantial (300-500 words). Make it the definitive article on this topic.' : 'Schrijf een uitgebreid longform artikel (2500-3500 woorden, ~10 minuten leestijd). Dit moet een diepgaand, magazine-kwaliteit stuk zijn. Voeg meerdere secties toe met unieke koppen, expertanalyse, praktijkvoorbeelden, historische context, toekomstperspectieven, en minimaal 4-5 verschillende invalshoeken. Elke sectie moet substantieel zijn (300-500 woorden). Maak het hét definitieve artikel over dit onderwerp.'
  }

  const styleInstructions = {
    professional: isEnglish ? 'Write as a news article for a professional audience - clear, informative and human' : 'Schrijf als een nieuwsbericht voor een professioneel publiek - helder, informatief en menselijk',
    engaging: isEnglish ? 'Write as an accessible news article that engages readers with story and context' : 'Schrijf als een toegankelijk nieuwsbericht dat lezers betrekt met verhaal en context',
    technical: isEnglish ? 'Write as a technical news article with in-depth analysis but understandable explanation' : 'Schrijf als een technisch nieuwsbericht met diepgaande analyse maar begrijpelijke uitleg',
    news: isEnglish ? 'Write as a clear news article in journalistic style - direct, informative and structured like traditional news articles' : 'Schrijf als een helder nieuwsbericht in journalistieke stijl - direct, informatief en gestructureerd zoals traditionele nieuwsartikelen'
  }

  const toneInstructions = {
    neutral: isEnglish ? 'Maintain a neutral, objective tone' : 'Houd een neutrale, objectieve toon aan',
    warning: isEnglish ? 'Emphasize the urgency and potential dangers' : 'Benadruk de urgentie en potentiële gevaren',
    informative: isEnglish ? 'Focus on providing useful information and context' : 'Focus op het verstrekken van nuttige informatie en context'
  }

  const audienceBlock = options.targetAudience
    ? (isEnglish
      ? `\nTARGET AUDIENCE: ${options.targetAudience}\nAdapt your writing style for this audience. Use terminology and references they recognize.\nFocus on aspects that are relevant to their role/interests.\n`
      : `\nDOELGROEP: ${options.targetAudience}\nPas je schrijfstijl aan op deze doelgroep. Gebruik terminologie en referenties die zij herkennen.\nFocus op aspecten die relevant zijn voor hun rol/interesses.\n`)
    : ''

  if (isEnglish) {
    return `
Rewrite the following news article for an English-speaking audience:

ORIGINAL TITLE: ${title}
ORIGINAL CONTENT: ${content}
${originalUrl ? `ORIGINAL URL: ${originalUrl}` : ''}
${audienceBlock}
INSTRUCTIONS:
STEP 1 - REWRITING:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Write in English as a news article/press release
- Maintain the core message and enrich with context where possible
- ORIGINAL HEADINGS: Create unique headings based on actual content - NEVER standard formulas
- QUOTES: If people are mentioned, generate 1 relevant quote based on context
- Avoid corporate jargon like 'Executive Summary' or 'Business Impact'
- Make it informative but readable for a broad audience
- Add relevant context for English readers
${customInstructions ? `\nSTEP 1B - EXTRA INSTRUCTIONS:\n${customInstructions}\n` : ''}
STEP 2 - SOURCES (CRITICAL):
- You MUST include at least 3-5 different sources in the article
- Include the original source: ${originalUrl || '[Original article URL]'}
- Add 2-4 additional authoritative sources from your knowledge (industry reports, vendor websites, research papers, major news outlets)
- Each source must be a real, plausible URL from a known domain (e.g., reuters.com, techcrunch.com, wired.com, arxiv.org, statista.com, gartner.com, mckinsey.com, etc.)
- Weave source references naturally into the article text (e.g., "According to a Gartner report..." or "Research published in Nature...")
- Also list ALL sources at the end in the Sources section with clickable HTML links
- NEVER have just 1 source — this is a well-researched article

STEP 3 - VISUAL ELEMENTS AND IMAGES (CRITICAL):
Include ALL of the following in a longform article (at least 3-4 visual elements total):

A) INLINE IMAGES: Add 3-4 relevant images throughout the article using Pexels:
   <figure style="margin:2rem 0"><img src="https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="descriptive alt text" style="width:100%;border-radius:12px;height:400px;object-fit:cover" /><figcaption style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">Caption describing the image</figcaption></figure>
   Use these Pexels photo IDs for common topics:
   - Technology/AI: 8386440, 17483868, 546819, 3861969, 8386434
   - Cybersecurity/hacking: 5380642, 60504, 5380603, 5240547, 207580
   - Marketing/business: 3184292, 7688336, 3182812, 590016, 265087
   - Data/analytics: 669615, 186461, 590022, 7947541, 6801648
   - Science/research: 2280571, 256381, 2280547, 3825527, 60582
   Pick IDs that match the article topic. Use DIFFERENT IDs for each image.

B) DATA TABLE: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:10px 14px;border-bottom:2px solid #e2e8f0;font-weight:600">Header</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px 14px">Data</td></tr></tbody></table>

C) KEY STATS BLOCK: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> with stat cards: <div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;text-align:center"><span style="display:block;font-size:28px;font-weight:700;color:#4f46e5">$4.2B</span><span style="font-size:13px;color:#64748b">Market size 2025</span></div>

D) CSS BAR CHART for market data or comparisons:
   <div style="margin:1.5rem 0">
   <div style="display:flex;align-items:center;margin-bottom:8px"><span style="width:120px;font-size:13px;color:#374151">Label</span><div style="flex:1;background:#e2e8f0;border-radius:4px;height:24px"><div style="width:75%;background:#4f46e5;border-radius:4px;height:24px;display:flex;align-items:center;padding-left:8px"><span style="font-size:12px;color:white;font-weight:600">75%</span></div></div></div>
   </div>

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. NO DATE: Do NOT include any publication date in the article - the CMS handles dates
2. ORIGINAL HEADINGS: Create unique headings based on actual content
3. QUOTES: If people are mentioned, generate 1-2 relevant quotes
4. LINKS: Integrate subtly in the text, no "Source:" labels
5. NO META INSTRUCTIONS: Do NOT include any "CHECK:" or review instructions in the output
6. VISUAL ELEMENTS: MUST include at least 3 images, 1 stat block or table, and 1 chart — never write without visual breaks
7. SOURCES: MUST include at least 3-5 different sources — never just 1

FORMAT YOUR ANSWER AS FOLLOWS:
[Powerful English title WITHOUT "TITLE:" before it]
SUBTITLE: [One-line subtitle that adds context or angle to the title]
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
Herschrijf het volgende nieuwsartikel voor een Nederlandse doelgroep:

ORIGINELE TITEL: ${title}
ORIGINELE CONTENT: ${content}
${originalUrl ? `ORIGINELE URL: ${originalUrl}` : ''}
${audienceBlock}
INSTRUCTIES:
STAP 1 - HERSCHRIJVEN:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Schrijf in het Nederlands als een nieuwsbericht/persbericht
- Behoud de kernboodschap en verrijk met context waar mogelijk
- ORIGINELE KOPPEN: Creëer unieke koppen op basis van de werkelijke inhoud - NOOIT standaard formules
- QUOTES: Als er personen worden genoemd, genereer 1 relevante quote gebaseerd op de context
- Vermijd corporate jargon zoals 'Executive Summary' of 'Business Impact'
- Gebruik specifieke, contextgerelateerde koppen (bijv. "Microsoft patch lost Exchange kwetsbaarheid op")
- Maak het informatief maar leesbaar voor een breed publiek
- Voeg relevante context toe voor Nederlandse lezers
${customInstructions ? `\nSTAP 1B - EXTRA INSTRUCTIES:\n${customInstructions}\n` : ''}
STAP 2 - BRONNEN:
- Voeg aan het einde een bronnenlijst toe
- Include originele bron: ${originalUrl || '[Originele artikel URL]'}
- Format als clickbare HTML links

STAP 3 - VISUELE ELEMENTEN:
Voeg minimaal 1-2 van de volgende visuele elementen toe waar relevant (met inline CSS voor portabiliteit):
- DATATABEL: Gebruik <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"> met <thead>, <tbody> en inline styling
- VERGELIJKING: Gebruik een tweekolomstabel om tools, aanpakken, of voor/na scenario's te vergelijken
- KERNCIJFERS: Gebruik <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> met statblokken (grote cijfers + beschrijving)
- TIJDLIJN: Gebruik een genummerde lijst met vetgedrukte datums/mijlpalen
- PRO/CON of CHECKLIST: Gebruik <ul> met ✅ en ❌ emoji prefixes

KRITIEKE INSTRUCTIES - LEES ZORGVULDIG:

1. GEEN DATUM: Voeg GEEN publicatiedatum toe aan het artikel - het CMS regelt datums
2. ORIGINELE KOPPEN: Creëer unieke koppen op basis van werkelijke inhoud
3. QUOTES: Als er personen worden genoemd, genereer 1 relevante quote
4. LINKS: Verwerk subtiel in de tekst, geen "Bron:" labels
5. GEEN META INSTRUCTIES: Voeg GEEN "CONTROLEER:" of review instructies toe aan de output
6. VISUELE ELEMENTEN: Voeg minimaal 1 tabel of statistiekblok toe — nooit een longform artikel zonder visuele onderbrekingen

FORMAT JE ANTWOORD ALS VOLGT:
[Krachtige Nederlandse titel ZONDER "TITEL:" ervoor]
SUBTITLE: [Eenregelige ondertitel die context of invalshoek toevoegt aan de titel]
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