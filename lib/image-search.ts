/**
 * Search for a relevant header image based on article title/topic.
 * Uses Unsplash API if UNSPLASH_ACCESS_KEY is set, otherwise falls back to a generated placeholder.
 */

export async function findHeaderImage(title: string, keywords?: string[]): Promise<string> {
  // Build search query from title — extract key terms
  const searchQuery = buildSearchQuery(title, keywords)

  // Try Unsplash API
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const image = await searchUnsplash(searchQuery)
      if (image) return image
    } catch (err) {
      console.warn('[image-search] Unsplash failed:', (err as Error).message)
    }
  }

  // Try Pexels API (free, generous limits)
  if (process.env.PEXELS_API_KEY) {
    try {
      const image = await searchPexels(searchQuery)
      if (image) return image
    } catch (err) {
      console.warn('[image-search] Pexels failed:', (err as Error).message)
    }
  }

  // Fallback: generated placeholder with topic text
  return generatePlaceholder(title)
}

/**
 * Place inline images into an article's section HTML with a live image search per
 * section heading.
 *
 * Done in code rather than in the prompt for two reasons: the model routinely ignored
 * the instruction and shipped articles with no images at all, and the prompt version
 * had to hand it a hardcoded list of photo IDs, so every article recycled the same few
 * stock photos. Searching per heading keeps the picture related to the section it sits
 * in, and the caller's `count` is honoured exactly.
 *
 * Skips the first section (an article should open with text, and the CMS adds its own
 * header image) and the sources section.
 */
export async function injectInlineImages(
  html: string,
  { count, topic = '' }: { count: number; topic?: string }
): Promise<string> {
  if (!html || count < 1) return html

  const sectionRe = /<section\b[^>]*>[\s\S]*?<\/section>/gi
  const sections = html.match(sectionRe)
  if (!sections || sections.length < 2) return html

  const isSourceSection = (s: string) => /id=["'](?:sources|bronnen|quellen)["']/i.test(s)

  const candidates: number[] = []
  for (let i = 1; i < sections.length; i++) {
    if (isSourceSection(sections[i])) continue
    if (/<figure/i.test(sections[i])) continue
    candidates.push(i)
  }
  if (!candidates.length) return html

  // Spread the images through the article instead of clustering them at the top.
  const wanted = Math.min(count, candidates.length)
  const step = candidates.length / wanted
  const targets = Array.from({ length: wanted }, (_, n) => candidates[Math.floor(n * step)])

  const replacements = new Map<number, string>()

  for (const idx of targets) {
    const heading = sections[idx].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || topic
    if (!heading) continue

    let url: string
    try {
      url = await findHeaderImage(`${heading} ${topic}`.trim())
    } catch {
      continue
    }
    // A generated placeholder looks broken inside the body — better no image.
    if (!url || url.includes('placehold.co')) continue

    const alt = heading.replace(/"/g, '')
    const figure = `<figure style="margin:2rem 0"><img src="${url}" alt="${alt}" style="width:100%;border-radius:12px;height:400px;object-fit:cover" loading="lazy" /><figcaption style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">${alt}</figcaption></figure>`

    // After the first paragraph, so the section still opens with prose.
    const paraEnd = sections[idx].indexOf('</p>')
    replacements.set(
      idx,
      paraEnd === -1
        ? sections[idx].replace(/<\/section>\s*$/i, `${figure}\n</section>`)
        : sections[idx].slice(0, paraEnd + 4) + '\n' + figure + sections[idx].slice(paraEnd + 4)
    )
  }

  if (!replacements.size) return html

  let n = -1
  return html.replace(sectionRe, (match) => {
    n++
    return replacements.get(n) ?? match
  })
}

function buildSearchQuery(title: string, keywords?: string[]): string {
  // Map brand/company names to relevant visual search terms
  const brandMap: Record<string, string> = {
    'openai': 'artificial intelligence technology',
    'mistral': 'artificial intelligence data center',
    'anthropic': 'artificial intelligence technology',
    'google': 'technology office',
    'apple': 'technology smartphone',
    'amazon': 'ecommerce warehouse',
    'microsoft': 'technology software',
    'nvidia': 'computer chip gpu',
    'meta': 'social media technology',
    'tesla': 'electric car technology',
    'deepseek': 'artificial intelligence',
    'chatgpt': 'artificial intelligence chatbot',
    'claude': 'artificial intelligence',
    'rewe': 'supermarket retail grocery',
    'lidl': 'supermarket retail grocery',
    'edeka': 'supermarket retail grocery',
    'zalando': 'fashion ecommerce',
    'otto': 'ecommerce retail',
    'mediamarkt': 'electronics retail store',
    'temu': 'ecommerce shopping',
    'shein': 'fashion ecommerce',
  }

  const titleLower = title.toLowerCase()

  // Check if title contains a known brand — use mapped search term instead
  for (const [brand, query] of Object.entries(brandMap)) {
    if (titleLower.includes(brand)) {
      return query
    }
  }

  // Topic-based search terms for common themes
  const topicMap: [RegExp, string][] = [
    [/cybersecur|hack|breach|vulnerabilit/i, 'cybersecurity digital security'],
    [/ai |artificial intellig|machine learn/i, 'artificial intelligence technology'],
    [/market|seo|advertis|brand/i, 'digital marketing business'],
    [/retail|pricing|ecommerce|e-commerce|shop/i, 'retail shopping store'],
    [/crypto|blockchain|bitcoin/i, 'cryptocurrency blockchain'],
    [/privacy|data protect|gdpr|surveillance/i, 'data privacy digital security'],
    [/robot|automat/i, 'robotics automation'],
    [/cloud|server|data center/i, 'cloud computing server'],
    [/smartphone|mobile|app /i, 'smartphone mobile technology'],
    [/wearable|smartwatch|ring/i, 'wearable technology smartwatch'],
  ]

  for (const [pattern, query] of topicMap) {
    if (pattern.test(title)) {
      return query
    }
  }

  // Fallback: extract meaningful terms from title
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'need', 'must', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'and', 'but', 'or', 'not', 'no',
    'this', 'that', 'these', 'those', 'it', 'its', 'how', 'why', 'what', 'when', 'where', 'who',
    'new', 'now', 'just', 'more', 'also', 'than', 'very', 'get', 'got', 'your', 'you', 'raises',
    'launches', 'announces', 'reveals', 'says', 'makes', 'takes', 'enters', 'becomes',
    'de', 'het', 'een', 'van', 'en', 'in', 'op', 'voor', 'met', 'naar', 'zijn', 'worden',
    'die', 'dat', 'er', 'niet', 'maar', 'ook', 'nog', 'wel', 'al', 'dan', 'uit', 'bij'])

  const words = titleLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  // Use keyword if available, otherwise top title terms
  const terms = keywords?.length ? [keywords[0].toLowerCase(), ...words.slice(0, 2)] : words.slice(0, 3)

  return [...new Set(terms)].slice(0, 3).join(' ') + ' technology'
}

// Random 1-based page in [1, max]. Sampling a random result window is the main lever
// against "same topic → same image": same query otherwise always returns the same top hits.
function randPage(max: number): number {
  return 1 + Math.floor(Math.random() * max)
}

async function searchUnsplash(query: string): Promise<string | null> {
  const perPage = 30
  const fetchPage = async (page: number) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } })
    if (!res.ok) return null
    const data = await res.json()
    return (data.results?.length ? data.results : null) as any[] | null
  }

  const page = randPage(3)
  // If a random deep page overshoots the result count, fall back to page 1.
  const results = (await fetchPage(page)) || (page > 1 ? await fetchPage(1) : null)
  if (!results?.length) return null

  // Pick randomly across the whole page (not just the top hit) for variety.
  const photo = results[Math.floor(Math.random() * results.length)]
  return photo.urls?.regular || photo.urls?.small || null
}

async function searchPexels(query: string): Promise<string | null> {
  const perPage = 80
  const fetchPage = async (page: number) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`
    const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY! } })
    if (!res.ok) return null
    const data = await res.json()
    return (data.photos?.length ? data.photos : null) as any[] | null
  }

  // Random page over the top ~5 windows (up to 400 results) + random pick across the
  // whole window. Cuts collision odds from ~1/5 (old top-5 pick) to ~1/400.
  const page = randPage(5)
  const photos = (await fetchPage(page)) || (page > 1 ? await fetchPage(1) : null)
  if (!photos?.length) return null

  const photo = photos[Math.floor(Math.random() * photos.length)]
  return photo.src?.landscape || photo.src?.large || null
}

function generatePlaceholder(title: string): string {
  // Generate a unique color based on title hash
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  const hex = hslToHex(hue, 60, 35)
  const shortTitle = title.substring(0, 40).replace(/[^\w\s]/g, '')
  return `https://placehold.co/1200x630/${hex}/ffffff?text=${encodeURIComponent(shortTitle)}`
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `${f(0)}${f(8)}${f(4)}`
}
