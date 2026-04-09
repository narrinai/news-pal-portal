import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null

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
  originalUrl?: string
): Promise<{ title: string; content: string; content_html: string; subtitle?: string; category?: string; faq?: { question: string; answer: string }[]; focus_keyword?: string; meta_description?: string; seo_keywords?: string[] }> {
  const prompt = createRewritePrompt(originalTitle, originalContent, options, customInstructions, originalUrl)
  const baseSystemPrompt = options.language === 'en'
    ? `You are a professional journalist who rewrites news articles for a broad audience.

Your task is to rewrite news articles while preserving the core message.

IMPORTANT: You do NOT have access to web browsing or external sources. Work only with the information provided.`
    : options.language === 'de'
    ? `Du bist ein professioneller Journalist, der Nachrichtenartikel für ein breites Publikum umschreibt.

Deine Aufgabe ist es, Nachrichtenartikel umzuschreiben und dabei die Kernbotschaft zu erhalten.

WICHTIG: Du hast KEINEN Zugang zum Internet oder externen Quellen. Arbeite nur mit den bereitgestellten Informationen.`
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
        usedModel = 'claude-sonnet-4-20250514'
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
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
    const faqMatches = faqText.matchAll(/[QF]:\s*(.+?)\nA:\s*(.+?)(?=\n[QF]:|\n*$)/gs)
    for (const match of faqMatches) {
      faq.push({ question: match[1].trim(), answer: match[2].trim() })
    }
  }

  // Parse title, subtitle, and content from main section
  const sections = mainContent.split(/^---$/m)
  let headerPart = sections[0]?.trim() || ''
  let content = sections[1]?.replace(/^CONTENT:\s*/i, '').trim() || (sections.length === 1 ? '' : '')

  // Extract title, subtitle, category, and SEO fields from header
  let title = originalTitle
  let subtitle = ''
  let category = ''
  let focus_keyword = ''
  let meta_description = ''
  let seo_keywords: string[] = []

  const headerLines = headerPart.split('\n').filter(l => l.trim())
  if (headerLines.length >= 1) {
    title = headerLines[0].replace(/^(TITEL|Titel|TITLE|Title):\s*/i, '').trim()
  }
  for (const line of headerLines) {
    const subMatch = line.match(/^SUBTITLE:\s*(.+)/i)
    if (subMatch) {
      subtitle = subMatch[1].trim()
    }
    const catMatch = line.match(/^CATEGORY:\s*(.+)/i)
    if (catMatch) {
      category = catMatch[1].trim()
    }
    const fkMatch = line.match(/^FOCUS_KEYWORD:\s*(.+)/i)
    if (fkMatch) {
      focus_keyword = fkMatch[1].trim()
    }
    const mdMatch = line.match(/^META_DESCRIPTION:\s*(.+)/i)
    if (mdMatch) {
      meta_description = mdMatch[1].trim()
    }
    const skMatch = line.match(/^SEO_KEYWORDS:\s*(.+)/i)
    if (skMatch) {
      seo_keywords = skMatch[1].split(',').map(k => k.trim()).filter(k => k)
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

function createRewritePrompt(
  title: string,
  content: string,
  options: RewriteOptions,
  customInstructions?: string,
  originalUrl?: string
): string {
  const isEnglish = options.language === 'en'
  const isGerman = options.language === 'de'

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
Schreibe den folgenden Nachrichtenartikel für ein deutschsprachiges Publikum um:

ORIGINALTITEL: ${title}
ORIGINALINHALT: ${content}
${originalUrl ? `ORIGINAL-URL: ${originalUrl}` : ''}
${audienceBlock}
ANWEISUNGEN:
SCHRITT 1 - UMSCHREIBEN:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Schreibe auf Deutsch als Nachrichtenartikel/Pressemitteilung
- Behalte die Kernbotschaft bei und bereichere mit Kontext wo möglich
- WICHTIG: Wenn der Originalinhalt kurz ist (z.B. nur eine Überschrift oder kurze Zusammenfassung), MUSST du den Artikel selbstständig auf die geforderte Wortanzahl erweitern. Recherchiere das Thema eigenständig — füge Hintergrund, Kontext, Branchentrends, Expertenperspektiven, Auswirkungen und Analyse hinzu. Die Quelle ist ein Ausgangspunkt, keine Grenze. Erreiche IMMER die geforderte Wortanzahl, unabhängig davon, wie kurz das Quellmaterial ist.
- ORIGINALE ÜBERSCHRIFTEN: Erstelle einzigartige Überschriften basierend auf dem tatsächlichen Inhalt
- ZITATE: Wenn Personen erwähnt werden, generiere 1 relevantes Zitat basierend auf dem Kontext
- Vermeide Unternehmens-Jargon
- Mache es informativ aber lesbar für ein breites Publikum
${customInstructions ? `\nSCHRITT 1B - ZUSÄTZLICHE ANWEISUNGEN:\n${customInstructions}\n` : ''}
SCHRITT 2 - QUELLEN (KRITISCH):
- Füge mindestens 3-5 verschiedene Quellen ein
- Füge die Originalquelle ein: ${originalUrl || '[Original-Artikel-URL]'}
- Füge 2-4 zusätzliche autoritative deutschsprachige Quellen hinzu (z.B. heise.de, spiegel.de, handelsblatt.com, faz.net, golem.de, t3n.de, manager-magazin.de)
- Verknüpfe Quellen natürlich im Text

SCHRITT 3 - VISUELLE ELEMENTE (KRITISCH):
Füge genau 2 Pexels-Bilder ein (NICHT mehr als 2) mit diesem Format:
<figure style="margin:2rem 0"><img src="https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="[Beschreibung]" style="width:100%;border-radius:12px;height:400px;object-fit:cover" /><figcaption style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">[Bildunterschrift]</figcaption></figure>
Verwende diese Pexels Photo-IDs (wähle 2 VERSCHIEDENE pro Artikel, variiere die Auswahl):
- Technologie/KI: 8386440, 17483868, 546819, 3861969, 8386434, 373543, 1148820, 2599244, 3183150, 4164418
- Cybersicherheit: 5380642, 60504, 5380603, 5240547, 207580, 5474295, 1089438, 2882630, 5380659, 4508751
- Handel/E-Commerce: 1005638, 3962294, 2292953, 3747468, 264636, 953862, 1239291, 230544, 1884581, 135620
- Business/Marketing: 3184292, 7688336, 3182812, 590016, 265087, 3153198, 1181622, 3183197, 5673488, 7176026
WICHTIG: Wähle 2 IDs die zum Artikelthema passen. Variiere die Auswahl — verwende NICHT immer die erste ID einer Liste.

Füge außerdem mindestens eines dieser Elemente ein:
- DATENTABELLE: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px">
- KERNZAHLEN: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> mit Statistikkarten

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
4. VISUELLE ELEMENTE: Genau 2 Bilder (nicht mehr), plus 1 Statistikblock oder Tabelle
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
- IMPORTANT: If the original content is short (e.g. just a headline or brief summary), you MUST use your knowledge to expand the article to the required word count. Research the topic independently — add background, context, industry trends, expert perspectives, implications, and analysis. The source is a starting point, not a limit. ALWAYS meet the required word count regardless of how short the source material is.
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

A) INLINE IMAGES: Add exactly 2 relevant images throughout the article using Pexels (NOT more than 2):
   <figure style="margin:2rem 0"><img src="https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="descriptive alt text" style="width:100%;border-radius:12px;height:400px;object-fit:cover" /><figcaption style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">Caption describing the image</figcaption></figure>
   Use these Pexels photo IDs for common topics (pick 2 DIFFERENT IDs per article, vary your choices):
   - Technology/AI: 8386440, 17483868, 546819, 3861969, 8386434, 373543, 1148820, 2599244, 3183150, 4164418
   - Cybersecurity/hacking: 5380642, 60504, 5380603, 5240547, 207580, 5474295, 1089438, 2882630, 5380659, 4508751
   - Marketing/business: 3184292, 7688336, 3182812, 590016, 265087, 3153198, 1181622, 3183197, 5673488, 7176026
   - Data/analytics: 669615, 186461, 590022, 7947541, 6801648, 7788009, 5935791, 590020, 4050291, 7172837
   - Science/research: 2280571, 256381, 2280547, 3825527, 60582, 2166, 325229, 356040, 2280549, 3912477
   - Retail/ecommerce: 1005638, 3962294, 2292953, 3747468, 264636, 953862, 1239291, 230544, 1884581, 135620
   IMPORTANT: Pick 2 IDs that you have NOT used recently. Vary your choices across articles — do NOT always pick the first ID in a list.

B) DATA TABLE: <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:14px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:10px 14px;border-bottom:2px solid #e2e8f0;font-weight:600">Header</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px 14px">Data</td></tr></tbody></table>

C) KEY STATS BLOCK: <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0"> with stat cards: <div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;text-align:center"><span style="display:block;font-size:28px;font-weight:700;color:#4f46e5">$4.2B</span><span style="font-size:13px;color:#64748b">Market size 2025</span></div>

D) CSS BAR CHART for market data or comparisons:
   <div style="margin:1.5rem 0">
   <div style="display:flex;align-items:center;margin-bottom:8px"><span style="width:120px;font-size:13px;color:#374151">Label</span><div style="flex:1;background:#e2e8f0;border-radius:4px;height:24px"><div style="width:75%;background:#4f46e5;border-radius:4px;height:24px;display:flex;align-items:center;padding-left:8px"><span style="font-size:12px;color:white;font-weight:600">75%</span></div></div></div>
   </div>

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
6. VISUAL ELEMENTS: MUST include exactly 2 images (no more), plus 1 stat block or table — never write without visual breaks
7. NO HEADER IMAGE: Do NOT place an image at the very top of the article (before or directly after the first heading). The CMS adds a separate header image automatically. Start with text content, then place the first image after the first 1-2 paragraphs
8. SOURCES: MUST include at least 3-5 different sources — never just 1
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
- BELANGRIJK: Als de originele content kort is (bijv. alleen een kop of korte samenvatting), MOET je het artikel zelfstandig uitbreiden tot het vereiste aantal woorden. Onderzoek het onderwerp onafhankelijk — voeg achtergrond, context, trends, expertperspectieven, implicaties en analyse toe. De bron is een startpunt, geen limiet. Haal ALTIJD het vereiste aantal woorden, ongeacht hoe kort het bronmateriaal is.
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
6. VISUELE ELEMENTEN: Voeg minimaal 1 tabel of statistiekblok toe — nooit een longform artikel zonder visuele onderbrekingen
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