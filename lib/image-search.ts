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

function buildSearchQuery(title: string, keywords?: string[]): string {
  // Remove common stop words and get meaningful terms
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'need', 'must', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'and', 'but', 'or', 'not', 'no',
    'this', 'that', 'these', 'those', 'it', 'its', 'how', 'why', 'what', 'when', 'where', 'who',
    'new', 'now', 'just', 'more', 'also', 'than', 'very', 'get', 'got', 'your', 'you',
    'de', 'het', 'een', 'van', 'en', 'in', 'op', 'voor', 'met', 'naar', 'zijn', 'worden',
    'die', 'dat', 'er', 'niet', 'maar', 'ook', 'nog', 'wel', 'al', 'dan', 'uit', 'bij'])

  const words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  // Take top 3 terms from title + first keyword if available
  const terms = words.slice(0, 3)
  if (keywords?.length) {
    terms.push(keywords[0].toLowerCase())
  }

  return [...new Set(terms)].slice(0, 4).join(' ')
}

async function searchUnsplash(query: string): Promise<string | null> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
  })

  if (!res.ok) return null

  const data = await res.json()
  const photo = data.results?.[0]
  if (!photo) return null

  // Use regular size (1080px wide) — good for headers
  return photo.urls?.regular || photo.urls?.small || null
}

async function searchPexels(query: string): Promise<string | null> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
  const res = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY! },
  })

  if (!res.ok) return null

  const data = await res.json()
  const photo = data.photos?.[0]
  if (!photo) return null

  // Use landscape size
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
