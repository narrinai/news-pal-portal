import * as cheerio from 'cheerio'

// Real outbound links for generated articles.
//
// The rewrite prompts used to ask the model for "a real, plausible URL from a known
// domain", which is a request to hallucinate: the models have no web access, so they
// produce well-formed URLs that 404. This module builds an allowlist of URLs we have
// actually seen (the source article itself, plus the links that article links out to)
// and then hard-strips anything outside that list from the generated HTML. The prompt
// asks nicely; the sanitizer is what guarantees it.

export interface SourceLink {
  url: string
  title: string
  /** Where this link came from — used only for logging/debugging. */
  origin?: 'source' | 'outbound' | 'cluster'
}

// Domains that are never useful as an article citation.
const BLOCKED_HOSTS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
  'pinterest.com', 'reddit.com', 'youtube.com', 'youtu.be', 'tiktok.com',
  'whatsapp.com', 'threads.net', 'mastodon.social', 'bsky.app',
  'google.com', 'doubleclick.net', 'googletagmanager.com',
]

// Paths that are section/utility pages rather than articles.
const BLOCKED_PATH_PATTERNS = [
  /^\/?$/,
  /\/(tag|tags|category|categories|author|authors|topic|topics)\//i,
  // Author bio / staff pages: real URLs, but citing them says nothing about the story.
  /\/(profile|profiles|team|staff|people|bio|analyst)s?\//i,
  /getdoc\.jsp/i,
  /\/(privacy|cookie|terms|disclaimer|contact|about|abonnement|subscribe|newsletter|login|register)/i,
  /\/(wp-content|wp-admin|feed|rss|amp)\b/i,
]

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Strip tracking params so the same link isn't allowlisted under two spellings. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref|source)/i.test(key)) u.searchParams.delete(key)
    }
    let out = u.toString()
    if (out.endsWith('/') && u.pathname !== '/') out = out.slice(0, -1)
    return out
  } catch {
    return url
  }
}

function isUsableLink(url: string, sourceHost: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false

  const host = hostOf(url)
  if (!host) return false
  if (BLOCKED_HOSTS.some(b => host === b || host.endsWith(`.${b}`))) return false
  if (BLOCKED_PATH_PATTERNS.some(p => p.test(u.pathname))) return false

  // Same-domain links are usually nav/related-article chrome, not citations.
  if (host === sourceHost) return false

  return true
}

/**
 * Pull the outbound links out of a scraped article's HTML. These are links a real
 * journalist put there, so they are safe to cite and genuinely relevant to the topic.
 */
export function extractOutboundLinks(html: string, sourceUrl: string, max = 12): SourceLink[] {
  const sourceHost = hostOf(sourceUrl)
  const $ = cheerio.load(html)

  $('script, style, nav, header, footer, aside, .sidebar, .comments, .related-posts, [role="navigation"], [role="banner"]').remove()

  // Prefer links inside the article body; fall back to the whole document.
  const bodySelectors = ['article', '[itemprop="articleBody"]', '.entry-content', '.post-content', '.article-body', 'main']
  let scope = $.root()
  for (const sel of bodySelectors) {
    const el = $(sel).first()
    if (el.length && el.find('a[href]').length > 0) {
      scope = el as any
      break
    }
  }

  const seen = new Set<string>()
  const links: SourceLink[] = []

  scope.find('a[href]').each((_, el) => {
    if (links.length >= max) return
    const rawHref = $(el).attr('href') || ''
    let abs: string
    try {
      abs = new URL(rawHref, sourceUrl).toString()
    } catch {
      return
    }
    const url = normalizeUrl(abs)
    if (seen.has(url)) return
    if (!isUsableLink(url, sourceHost)) return

    const text = $(el).text().trim().replace(/\s+/g, ' ')
    // Anchor text like "here" or "click" tells the model nothing about the target.
    if (text.length < 4 || text.length > 160) return

    seen.add(url)
    links.push({ url, title: text, origin: 'outbound' })
  })

  return links
}

/** Deduplicate a source list by normalized URL, keeping the first (most authoritative) entry. */
export function dedupeSources(sources: SourceLink[]): SourceLink[] {
  const seen = new Set<string>()
  const out: SourceLink[] = []
  for (const s of sources) {
    if (!s?.url) continue
    const url = normalizeUrl(s.url)
    if (seen.has(url)) continue
    seen.add(url)
    out.push({ ...s, url })
  }
  return out
}

/**
 * The prompt block that replaces "invent some plausible URLs". Lists every URL the
 * model is permitted to use, with the real page title so it can cite it meaningfully.
 */
export function buildAllowedSourcesBlock(sources: SourceLink[], language: 'nl' | 'en' | 'de'): string {
  if (!sources.length) return ''

  const list = sources
    .map((s, i) => `${i + 1}. ${s.title || hostOf(s.url)} — ${s.url}`)
    .join('\n')

  if (language === 'en') {
    return `
ALLOWED SOURCES — the ONLY URLs you may link to:
${list}

ABSOLUTE RULE ON LINKS: You have no web access and cannot verify any URL. Every link you write MUST be copied character-for-character from the list above. NEVER construct, guess, complete or "remember" a URL that is not in that list — not even for a well-known site like reuters.com or gartner.com. A plausible-looking invented URL is a factual error and worse than no link at all.
- You may mention any organisation, report or study by name in the text WITHOUT linking it. Do that instead of inventing a link.
- If the list has fewer entries than you would like, write fewer links. That is the correct outcome.
- In the Sources section, list only URLs from the list above.`
  }

  if (language === 'de') {
    return `
ERLAUBTE QUELLEN — die EINZIGEN URLs, die du verlinken darfst:
${list}

ABSOLUTE REGEL ZU LINKS: Du hast keinen Internetzugang und kannst keine URL überprüfen. Jeder Link, den du schreibst, MUSS zeichengenau aus der obigen Liste kopiert werden. Konstruiere, errate oder "erinnere" NIEMALS eine URL, die nicht in dieser Liste steht — auch nicht für bekannte Seiten wie reuters.com oder gartner.com. Eine plausibel aussehende erfundene URL ist ein sachlicher Fehler und schlimmer als gar kein Link.
- Du darfst jede Organisation, jeden Bericht oder jede Studie im Text namentlich erwähnen, OHNE zu verlinken. Tu das, statt einen Link zu erfinden.
- Wenn die Liste weniger Einträge hat als du möchtest, schreibe weniger Links. Das ist das richtige Ergebnis.
- Führe im Quellenabschnitt ausschließlich URLs aus der obigen Liste auf.`
  }

  return `
TOEGESTANE BRONNEN — de ENIGE URLs die je mag linken:
${list}

ABSOLUTE REGEL OVER LINKS: Je hebt geen internettoegang en kunt geen enkele URL controleren. Elke link die je schrijft MOET teken voor teken uit bovenstaande lijst worden gekopieerd. Verzin, gok of "herinner" NOOIT een URL die niet in die lijst staat — ook niet voor een bekende site als reuters.com, nu.nl of gartner.com. Een geloofwaardig ogende verzonnen URL is een feitelijke fout en erger dan helemaal geen link.
- Je mag elke organisatie, elk rapport of elk onderzoek gewoon bij naam noemen in de tekst ZONDER te linken. Doe dat in plaats van een link te verzinnen.
- Staan er minder bronnen in de lijst dan je zou willen? Schrijf dan minder links. Dat is de juiste uitkomst.
- Zet in de bronnenlijst uitsluitend URLs uit bovenstaande lijst.`
}

/**
 * Last line of defence: remove every <a href> from the generated HTML whose target is
 * not on the allowlist, keeping the anchor text as plain prose. Also drops the list
 * items that consisted only of such a link, so no empty bullets are left behind.
 */
export function sanitizeArticleLinks(
  html: string,
  sources: SourceLink[],
  extraAllowedUrls: string[] = []
): { html: string; removed: string[] } {
  if (!html) return { html, removed: [] }

  const allowed = new Set<string>()
  for (const s of sources) allowed.add(normalizeUrl(s.url))
  for (const u of extraAllowedUrls) if (u) allowed.add(normalizeUrl(u))

  // Internal links (relative, anchors, mailto) are the site's own and never hallucinated.
  const isInternal = (href: string) =>
    !href || href.startsWith('#') || href.startsWith('/') || href.startsWith('mailto:') || href.startsWith('tel:')

  const removed: string[] = []

  const cleaned = html.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, attrs: string, inner: string) => {
      const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i)
      const href = hrefMatch ? hrefMatch[1].trim() : ''
      if (isInternal(href)) return match
      if (allowed.has(normalizeUrl(href))) return match
      removed.push(href)
      return inner
    }
  )

  // A <li> that held nothing but a stripped link becomes an orphaned bare-text entry.
  // Only prune those inside the sources section — elsewhere, link-free <li> items are
  // ordinary bullets that must survive untouched.
  const withoutOrphans = removed.length
    ? cleaned.replace(
        /<section[^>]*id=["'](?:sources|bronnen|quellen)["'][^>]*>[\s\S]*?<\/section>/gi,
        (section) =>
          section.replace(/<li\b[^>]*>(?:(?!<li\b)[\s\S])*?<\/li>/gi, (li) =>
            /<a\b/i.test(li) ? li : ''
          )
      )
    : cleaned

  return { html: withoutOrphans, removed }
}
