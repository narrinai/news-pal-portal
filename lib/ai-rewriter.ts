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
  length: 'short' | 'medium' | 'long' | 'extra-long'
  language: 'nl' | 'en'
  tone: 'neutral' | 'warning' | 'informative'
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
  const systemPrompt = customInstructions || `Je bent een professionele Nederlandse tech journalist gespecialiseerd in cybersecurity.

Je taak is om nieuwsartikelen te herschrijven voor een Nederlandse doelgroep, waarbij je de kernboodschap behoudt.

BELANGRIJK: Je hebt GEEN toegang tot web browsing of externe bronnen. Werk alleen met de informatie die je krijgt.`

  const refusalPatterns = [
    /^I('m| am) sorry/im,
    /^I('m| am) unable to/im,
    /^I can'?t (assist|help|fulfill|perform|complete|browse|access)/im,
    /^Unfortunately,? I (cannot|can'?t|am unable)/im,
    /^I (do not|don'?t) have (access|the ability)/im,
    /against my (guidelines|policies|content policy)/i,
    /violates? (my|our|the) (content |usage )?polic/i,
  ]

  // Try OpenAI first
  let response = ''
  let usedModel = 'gpt-4o'
  const maxTokens = options.length === 'extra-long' ? 4000 : 2000

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
    'extra-long': isEnglish ? 'Write a comprehensive, in-depth article (1200-1500 words). Include detailed analysis, multiple perspectives, and thorough coverage of the topic' : 'Schrijf een uitgebreid, diepgaand artikel (1200-1500 woorden). Voeg gedetailleerde analyse, meerdere perspectieven en grondige dekking van het onderwerp toe'
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

  if (isEnglish) {
    return `
Rewrite the following cybersecurity news article for an English-speaking audience:

ORIGINAL TITLE: ${title}
ORIGINAL CONTENT: ${content}
${originalUrl ? `ORIGINAL URL: ${originalUrl}` : ''}

INSTRUCTIONS:
STEP 1 - RESEARCH:
- First search online for 2-3 related sources on this topic
- Check vendor websites, security advisories, NIST, CISA for updates
- Look for additional context, impact, or solutions
- Verify and update information from the original article if needed

STEP 2 - REWRITING:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Write in English as a news article/press release
- Integrate information from your online research naturally into the story
- Maintain the core message but enrich with found sources
- ORIGINAL HEADINGS: Create unique headings based on actual content - NEVER standard formulas
- QUOTES: If people are mentioned, generate 1 relevant quote based on context
- Avoid corporate jargon like 'Executive Summary' or 'Business Impact'
- Use specific, context-related headings (e.g., "Microsoft patch fixes Exchange vulnerability")
- Make it informative but readable for a broad audience
- Add relevant context for English readers

STEP 2B - INTERNAL LINKS:
- Naturally weave in 5-8 internal links to relevant CompanionGuide.ai pages throughout the article
- Link generic terms to overview/category pages using natural anchor text:
  * "AI chatbot(s)" or "AI chat" → <a href="/companions">AI chatbots</a>
  * "AI girlfriend" → <a href="/categories/best-ai-girlfriend">AI girlfriend</a>
  * "AI boyfriend" → <a href="/categories/ai-boyfriend-companions">AI boyfriend</a>
  * "AI companion(s)" → <a href="/companions">AI companions</a>
  * "roleplay" or "character chat" → <a href="/categories/roleplay-character-chat-companions">roleplay</a>
  * "AI voice" or "voice chat" → <a href="/categories/ai-voice-companions">voice chat</a>
  * "NSFW AI" or "adult AI" → <a href="/categories/best-ai-nsfw-chat">NSFW AI chat</a>
  * "AI anime" → <a href="/categories/ai-anime-companions">AI anime</a>
  * "romantic AI" → <a href="/categories/ai-romantic-companions">romantic AI</a>
- Link to specific AI companion reviews when mentioning platforms: /companions/[slug] (e.g. /companions/secrets-ai, /companions/nomi-ai, /companions/joi-ai, /companions/ourdream-ai, /companions/soulkyn-ai, /companions/girlfriendgpt, /companions/darlink-ai)
- Use descriptive anchor text that fits naturally in the sentence
- Do NOT group all internal links together - spread them throughout the article
- Do NOT link the same term more than once

STEP 3 - SOURCES AND URL VALIDATION:
- Test all URLs before adding them - use ONLY working links
- If a URL returns 404 or error, find an alternative source or omit
- Add a complete source list at the end with ONLY verified working links
- Include original source: ${originalUrl || '[Original article URL]'}
- Include all online sources found with working URLs
- Format as clickable HTML links
- NEVER add broken or 404 links to the source list

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. NO DATE: Do NOT include any publication date in the article - the CMS handles dates
2. ORIGINAL HEADINGS: Create unique headings based on actual content
3. QUOTES: If people are mentioned, generate 1 relevant quote
4. LINKS: Integrate subtly in the text, no "Source:" labels
5. NO META INSTRUCTIONS: Do NOT include any "CHECK:" or review instructions in the output

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
<li><a href="[RESEARCH_URL_1]" target="_blank" rel="noopener noreferrer">[EXTRA_SOURCE_1]</a></li>
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

Start rewriting now:
`
  }

  return `
Herschrijf het volgende cybersecurity nieuwsartikel voor een Nederlandse doelgroep:

ORIGINELE TITEL: ${title}
ORIGINELE CONTENT: ${content}
${originalUrl ? `ORIGINELE URL: ${originalUrl}` : ''}

INSTRUCTIES:
STAP 1 - RESEARCH:
- Zoek eerst online naar 2-3 gerelateerde bronnen over dit onderwerp
- Controleer vendor websites, security advisories, NIST, CISA voor updates
- Zoek naar aanvullende context, gevolgen, of oplossingen
- Verifieer en update informatie uit het originele artikel indien nodig

STAP 2 - HERSCHRIJVEN:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Schrijf in het Nederlands als een nieuwsbericht/persbericht
- Integreer informatie uit je online research natuurlijk in het verhaal
- Behoud de kernboodschap maar verrijk met gevonden bronnen
- ORIGINELE KOPPEN: Creëer unieke koppen op basis van de werkelijke inhoud - NOOIT standaard formules
- QUOTES: Als er personen worden genoemd, genereer 1 relevante quote gebaseerd op de context
- Vermijd corporate jargon zoals 'Executive Summary' of 'Business Impact'
- Gebruik specifieke, contextgerelateerde koppen (bijv. "Microsoft patch lost Exchange kwetsbaarheid op")
- Maak het informatief maar leesbaar voor een breed publiek
- Voeg relevante context toe voor Nederlandse lezers

STAP 2B - INTERNE LINKS:
- Verwerk op een natuurlijke manier 5-8 interne links naar relevante CompanionGuide.ai pagina's door het artikel heen
- Link generieke termen naar overzichts-/categoriepagina's met natuurlijke ankertekst:
  * "AI chatbot(s)" of "AI chat" → <a href="/companions">AI chatbots</a>
  * "AI vriendin" of "AI girlfriend" → <a href="/categories/best-ai-girlfriend">AI girlfriend</a>
  * "AI vriend" of "AI boyfriend" → <a href="/categories/ai-boyfriend-companions">AI boyfriend</a>
  * "AI companion(s)" → <a href="/companions">AI companions</a>
  * "roleplay" of "character chat" → <a href="/categories/roleplay-character-chat-companions">roleplay</a>
  * "AI voice" of "voice chat" → <a href="/categories/ai-voice-companions">voice chat</a>
  * "NSFW AI" of "adult AI" → <a href="/categories/best-ai-nsfw-chat">NSFW AI chat</a>
  * "AI anime" → <a href="/categories/ai-anime-companions">AI anime</a>
  * "romantische AI" → <a href="/categories/ai-romantic-companions">romantische AI</a>
- Link naar specifieke AI companion reviews bij het noemen van platforms: /companions/[slug] (bijv. /companions/secrets-ai, /companions/nomi-ai, /companions/joi-ai, /companions/ourdream-ai, /companions/soulkyn-ai, /companions/girlfriendgpt, /companions/darlink-ai)
- Gebruik beschrijvende ankertekst die natuurlijk in de zin past
- Groepeer NIET alle interne links bij elkaar - verspreid ze door het hele artikel
- Link NIET dezelfde term meer dan één keer

STAP 3 - BRONNEN EN URL VALIDATIE:
- Test alle URLs voordat je ze toevoegt - gebruik ALLEEN werkende links
- Als een URL een 404 of fout geeft, zoek een alternatieve bron of laat weg
- Voeg aan het einde een complete bronnenlijst toe met ALLEEN geverifieerde werkende links
- Include originele bron: ${originalUrl || '[Originele artikel URL]'}
- Include alle online gevonden bronnen met werkende URLs
- Format als clickbare HTML links
- NOOIT broken of 404 links toevoegen aan de bronnenlijst

KRITIEKE INSTRUCTIES - LEES ZORGVULDIG:

1. GEEN DATUM: Voeg GEEN publicatiedatum toe aan het artikel - het CMS regelt datums
2. ORIGINELE KOPPEN: Creëer unieke koppen op basis van werkelijke inhoud
3. QUOTES: Als er personen worden genoemd, genereer 1 relevante quote
4. LINKS: Verwerk subtiel in de tekst, geen "Bron:" labels
5. GEEN META INSTRUCTIES: Voeg GEEN "CONTROLEER:" of review instructies toe aan de output

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
<li><a href="[RESEARCH_URL_1]" target="_blank" rel="noopener noreferrer">[EXTRA_BRON_1]</a></li>
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

BELANGRIJK: Voeg GEEN datum, locatie prefix, of "CONTROLEER:" instructies toe aan je output. Begin direct met de inhoud.

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