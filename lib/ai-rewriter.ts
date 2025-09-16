import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface RewriteOptions {
  style: 'professional' | 'engaging' | 'technical' | 'news'
  length: 'short' | 'medium' | 'long'
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
): Promise<{ title: string; content: string; wordpressHtml: string }> {
  try {
    const prompt = createRewritePrompt(originalTitle, originalContent, options, customInstructions, originalUrl)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // Updated to model with web browsing capability
      messages: [
        {
          role: 'system',
          content: customInstructions || `Je bent een professionele Nederlandse tech journalist gespecialiseerd in cybersecurity. 

Je hebt web browsing capability. Voordat je het artikel herschrijft:
1. Zoek online naar 2-3 gerelateerde bronnen over hetzelfde onderwerp
2. Gebruik betrouwbare cybersecurity bronnen (NIST, CISA, vendor advisories)
3. Controleer of er recente updates of aanvullende informatie beschikbaar is
4. Integreer deze extra informatie in je herschrijving

Je taak is om nieuwsartikelen te herschrijven voor een Nederlandse doelgroep, waarbij je de kernboodschap behoudt maar verrijkt met aanvullende bronnen en context.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const response = completion.choices[0]?.message?.content || ''
    
    // Parse the response to extract title and content
    const sections = response.split('---')
    let title = sections[0]?.replace(/^(TITEL|Titel):\s*/i, '').trim() || originalTitle
    let content = sections[1]?.replace(/^CONTENT:\s*/i, '').trim() || response

    // If there's no --- separator, try to extract title from first line
    if (sections.length === 1) {
      const lines = response.split('\n')
      const firstLine = lines[0]?.replace(/^(TITEL|Titel):\s*/i, '').trim()
      if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
        title = firstLine
        content = lines.slice(1).join('\n').replace(/^CONTENT:\s*/i, '').trim()
      }
    }

    // If the content already contains HTML tags, use it as-is for WordPress
    // Otherwise, generate HTML from plain text
    let wordpressHtml: string

    if (content.includes('<p>') || content.includes('<h2>')) {
      // Content is already HTML formatted
      wordpressHtml = content
      // Convert HTML to plain text for the content field
      content = content
        .replace(/<h[1-6][^>]*>/g, '\n\n')
        .replace(/<\/h[1-6]>/g, '\n')
        .replace(/<p[^>]*>/g, '\n')
        .replace(/<\/p>/g, '')
        .replace(/<li[^>]*>/g, '• ')
        .replace(/<\/li>/g, '\n')
        .replace(/<ul[^>]*>|<\/ul>/g, '\n')
        .replace(/<strong[^>]*>|<\/strong>/g, '')
        .replace(/<em[^>]*>|<\/em>/g, '')
        .replace(/<a[^>]*>|<\/a>/g, '')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    } else {
      // Content is plain text, generate HTML
      wordpressHtml = generateWordPressHTML(title, content)
    }
    
    return {
      title,
      content,
      wordpressHtml
    }
  } catch (error) {
    console.error('Error rewriting article:', error)
    throw new Error('Failed to rewrite article')
  }
}

function createRewritePrompt(
  title: string,
  content: string,
  options: RewriteOptions,
  customInstructions?: string,
  originalUrl?: string
): string {
  const lengthInstructions = {
    short: 'Houd de tekst kort en bondig (200-300 woorden)',
    medium: 'Schrijf een artikel van gemiddelde lengte (400-600 woorden)',
    long: 'Schrijf een uitgebreid artikel (700-1000 woorden)'
  }

  const styleInstructions = {
    professional: 'Schrijf als een nieuwsbericht voor een professioneel publiek - helder, informatief en menselijk',
    engaging: 'Schrijf als een toegankelijk nieuwsbericht dat lezers betrekt met verhaal en context',
    technical: 'Schrijf als een technisch nieuwsbericht met diepgaande analyse maar begrijpelijke uitleg',
    news: 'Schrijf als een helder nieuwsbericht in journalistieke stijl - direct, informatief en gestructureerd zoals traditionele nieuwsartikelen'
  }

  const toneInstructions = {
    neutral: 'Houd een neutrale, objectieve toon aan',
    warning: 'Benadruk de urgentie en potentiële gevaren',
    informative: 'Focus op het verstrekken van nuttige informatie en context'
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
- Gebruik een nieuwsbericht structuur: wat, waarom, impact, vervolgstappen
- Vermijd corporate jargon zoals 'Executive Summary' of 'Business Impact'
- Gebruik menselijke, toegankelijke koppen zoals 'Wat is er gebeurd?' 
- Maak het informatief maar leesbaar voor een breed publiek
- Voeg relevante context toe voor Nederlandse lezers

STAP 3 - BRONNEN:
- Voeg aan het einde een complete bronnenlijst toe
- Include originele bron: ${originalUrl || '[Originele artikel URL]'}
- Include alle online gevonden bronnen met werkende URLs
- Format als clickbare HTML links

KRITIEKE INSTRUCTIES - LEES ZORGVULDIG:

1. DATUM: Gebruik de EXACTE publicatiedatum van het ORIGINELE artikel (NIET vandaag!)
2. LOCATIE: Gebruik de relevante locatie waar het incident plaatsvond
3. KOPJES: Gebruik ALLEEN zakelijke stellingen, NOOIT vragen
4. LINKS: Voeg ALTIJD werkende hyperlinks toe, zowel in intro als bronnenlijst!

VERBODEN KOPJES:
❌ "Wat is er gebeurd?" ❌ "Waarom is dit belangrijk?" ❌ "Wat betekent dit?"

TOEGESTANE KOPJES:
✅ "Details van de aanval" ✅ "Impact op bedrijfsvoering" ✅ "Reactie van het bedrijf"

FORMAT JE ANTWOORD ALS VOLGT:
[Krachtige Nederlandse titel ZONDER "TITEL:" ervoor]
---
<p>[Relevante locatie], [EXACTE datum originele artikel] - [kernboodschap]. <a href="${originalUrl || '[URL]'}" target="_blank">Bron: [Platform naam]</a></p>

<p><strong>[Zakelijk kopje - GEEN vraag!]</strong><br>
[Details direct na het kopje, geen extra regel ertussen]</p>

<p><strong>[Volgend zakelijk kopje]</strong><br>
[Volgende paragraaf direct na het kopje]</p>

<p><strong>Bronnen en meer informatie</strong></p>
<ul>
<li><a href="${originalUrl || '[URL]'}" target="_blank">[Platform naam] - Origineel artikel</a></li>
<li><a href="[RESEARCH_URL_1]" target="_blank">[EXTRA_BRON_1]</a></li>
<li><a href="[RESEARCH_URL_2]" target="_blank">[EXTRA_BRON_2]</a></li>
</ul>

CONTROLEER: Exacte datum gebruikt? Bronlink in intro? Werkende hyperlinks in bronnenlijst?

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