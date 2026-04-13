import * as cheerio from 'cheerio'

/**
 * Fetch and extract the main article content from a URL.
 * Uses common article selectors and falls back to largest text block.
 */
export async function scrapeArticleContent(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsPalBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) return ''
    const html = await res.text()
    return extractContent(html)
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

function extractContent(html: string): string {
  const $ = cheerio.load(html)

  // Remove noise
  $('script, style, nav, header, footer, aside, .sidebar, .comments, .ad, .advertisement, .social-share, .related-posts, [role="navigation"], [role="banner"], .cookie-banner, .newsletter-signup').remove()

  // Try common article content selectors (ordered by specificity)
  const selectors = [
    'article .entry-content',
    'article .post-content',
    'article .article-body',
    'article .article-content',
    '.post-body',
    '.story-body',
    '[itemprop="articleBody"]',
    '.entry-content',
    '.post-content',
    '.article-body',
    '.article-content',
    'article',
    'main',
    '.content',
  ]

  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length) {
      const text = extractText(el, $)
      if (text.length > 200) return text
    }
  }

  // Fallback: find the largest text block among <p> clusters
  const paragraphs: string[] = []
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 40) paragraphs.push(text)
  })

  return paragraphs.join('\n\n')
}

function extractText(el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
  const parts: string[] = []
  el.find('h1, h2, h3, h4, p, li, blockquote, figcaption').each((_, child) => {
    const tag = (child as any).tagName
    const text = $(child).text().trim()
    if (!text) return
    if (tag?.match(/^h[1-4]$/)) {
      parts.push(`\n## ${text}\n`)
    } else if (tag === 'li') {
      parts.push(`- ${text}`)
    } else if (tag === 'blockquote') {
      parts.push(`> ${text}`)
    } else {
      parts.push(text)
    }
  })
  return parts.join('\n\n')
}
