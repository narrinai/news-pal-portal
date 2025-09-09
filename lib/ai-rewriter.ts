import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_TOKEN_NEWSPAL,
})

export interface RewriteOptions {
  style: 'professional' | 'engaging' | 'technical'
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
  }
): Promise<{ title: string; content: string; wordpressHtml: string }> {
  try {
    const prompt = createRewritePrompt(originalTitle, originalContent, options)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Je bent een professionele Nederlandse tech journalist gespecialiseerd in cybersecurity. Je taak is om nieuwsartikelen te herschrijven voor een Nederlandse doelgroep, waarbij je de kernboodschap behoudt maar de tekst toegankelijker en boeiender maakt.`
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
    const title = sections[0]?.replace('TITEL:', '').trim() || originalTitle
    const content = sections[1]?.replace('CONTENT:', '').trim() || response
    
    // Generate WordPress HTML
    const wordpressHtml = generateWordPressHTML(title, content)
    
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
  options: RewriteOptions
): string {
  const lengthInstructions = {
    short: 'Houd de tekst kort en bondig (200-300 woorden)',
    medium: 'Schrijf een artikel van gemiddelde lengte (400-600 woorden)',
    long: 'Schrijf een uitgebreid artikel (700-1000 woorden)'
  }

  const styleInstructions = {
    professional: 'Gebruik een professionele, zakelijke toon',
    engaging: 'Schrijf op een boeiende, toegankelijke manier die lezers betrekt',
    technical: 'Gebruik technische precisie en gedetailleerde uitleg'
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

INSTRUCTIES:
- ${styleInstructions[options.style]}
- ${lengthInstructions[options.length]}
- ${toneInstructions[options.tone]}
- Schrijf in het Nederlands
- Behoud de kernboodschap en belangrijke feiten
- Maak de tekst SEO-vriendelijk
- Gebruik duidelijke alinea's
- Voeg relevante context toe voor Nederlandse lezers waar nodig
- Vermijd jargon zonder uitleg

FORMAT JE ANTWOORD ALS VOLGT:
TITEL: [Nieuwe Nederlandse titel]
---
CONTENT: [Herschreven Nederlandse content]

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