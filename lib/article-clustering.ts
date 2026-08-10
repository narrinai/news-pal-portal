// Find news items that cover the SAME STORY, so several reports can be synthesised into
// one original article instead of each becoming its own thin rewrite.
//
// This is deliberately not the thematic clustering the longread pipeline does. There the
// question is "what subject deserves a deep dive"; here it is the much tighter "are these
// two items about the same event". It also runs with no API call: at pipeline scale an
// LLM call per candidate pair would dominate the cost of the whole run.
//
// Scoring is term overlap weighted by inverse document frequency over the day's pool.
// Plain overlap does not work on headlines: "AI Gigafactories: hoe beleggen in dit
// Europese megaproject" and "Nog beleggen in Seoel na de technologische crash?" share
// half their significant words, all of which are the word "beleggen" and friends. IDF
// makes shared rare terms ("BOJ", "PBOC", "Hormuz") carry the decision and shared
// boilerplate carry almost nothing.

export interface ClusterableArticle {
  title?: string
  description?: string
  url?: string
  source?: string
  publishedAt?: string
  [key: string]: any
}

const STOPWORDS = new Set(
  (
    // Dutch
    'de het een van en in op voor met naar zijn worden die dat er niet maar ook nog wel al dan uit bij aan als om te ' +
    'over door tot deze dit zich meer heeft hebben was waren wordt werd kan kunnen zal zou moet na ' +
    // English
    'the a an of to in for on with at by is are as from after over about into its his her their this that ' +
    'new says say will can could would has have had was were be been more than amid ahead not but also ' +
    // German
    'der die das den dem des ein eine einen und oder aber auch noch schon nach bei aus vor mit von zu im am ' +
    'ist sind war waren wird werden kann können soll sollen für sich nicht'
  ).split(' ')
)

/**
 * Drop the " - Outlet" / " | Outlet" tail that aggregators append to headlines.
 *
 * Without this the outlet name becomes content: two unrelated investing stories from
 * test-aankoop.be matched on the terms "test" and "aankoop", which are rare in the pool
 * and therefore scored as highly distinctive.
 */
export function stripOutletSuffix(title: string, source?: string): string {
  const raw = String(title || '').trim()
  // Greedy head so the split lands on the LAST separator: outlet names contain hyphens
  // themselves ("test-aankoop.be"), which a non-greedy tail would refuse to match.
  const match = raw.match(/^(.*)\s+[-|–—]\s+(.{2,40})$/)
  if (!match) return raw

  const [, head, tail] = match
  if (head.trim().length < 15) return raw

  const looksLikeDomain = /\.[a-z]{2,4}$/i.test(tail.trim())
  const looksLikeSource =
    !!source && tail.trim().toLowerCase().replace(/\s+/g, '') === source.toLowerCase().replace(/\s+/g, '')

  return looksLikeDomain || looksLikeSource ? head.trim() : raw
}

/** Significant, deduplicated terms from a headline. */
function terms(text: string): string[] {
  return [
    ...new Set(
      String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w))
    ),
  ]
}

/** Document frequency per term across the pool. */
function buildDf(pool: ClusterableArticle[]): Map<string, number> {
  const df = new Map<string, number>()
  for (const a of pool) {
    for (const t of terms(stripOutletSuffix(a.title || '', a.source))) df.set(t, (df.get(t) || 0) + 1)
  }
  return df
}

function hoursBetween(a?: string, b?: string): number {
  if (!a || !b) return Infinity
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity
  return Math.abs(ta - tb) / 36e5
}

export interface RelatedOptions {
  /** How far apart two reports of the same event may be published. */
  maxAgeHours?: number
  /** Cosine-style similarity floor, 0..1. */
  minScore?: number
  /** Shared terms must include at least this many genuinely distinctive ones. */
  minDistinctiveTerms?: number
  /** Cap on returned siblings. */
  limit?: number
}

/**
 * Return the items in `pool` that report the same story as `target`, best match first.
 * `pool` should be the automation's recent candidates — IDF is computed over it, so a
 * pool spanning one niche and roughly one day gives the sharpest weighting.
 */
export function findRelatedArticles(
  target: ClusterableArticle,
  pool: ClusterableArticle[],
  {
    maxAgeHours = 48,
    minScore = 0.25,
    // Three, not two: a multi-word proper noun supplies two "distinctive" terms on its
    // own, so a two-term rule merged "Wall Street's biggest bank raises expectations"
    // with "Beursupdate: AEX op Wall Street". Precision matters more than recall here —
    // a wrong merge conflates two unrelated stories into one article, while a missed one
    // merely leaves the article as short as it was before.
    minDistinctiveTerms = 3,
    limit = 4,
  }: RelatedOptions = {}
): ClusterableArticle[] {
  const targetTerms = terms(stripOutletSuffix(target.title || '', target.source))
  if (targetTerms.length < 2) return []

  const effectivePool = pool.length > 1 ? pool : [target, ...pool]
  const df = buildDf(effectivePool)

  // Weight terms against an assumed corpus of at least this size. On a genuinely small
  // pool (a niche automation with a handful of items that day) the raw log ratios all
  // collapse toward zero and drag every similarity score under the threshold, so real
  // matches would be missed purely because the day was quiet.
  const MIN_CORPUS = 40
  const n = Math.max(MIN_CORPUS, effectivePool.length)

  // A term is distinctive when it is genuinely rare in this pool. Measured on document
  // frequency, not on IDF against the median: any SHARED term has df >= 2, while most
  // terms in a headline pool appear exactly once, so a median-IDF test can never pass.
  const distinctiveMaxDf = Math.max(3, Math.ceil(effectivePool.length * 0.06))

  const weightOf = (t: string) => Math.log(n / (df.get(t) || 1))
  const norm = (ts: string[]) => Math.sqrt(ts.reduce((s, t) => s + weightOf(t) ** 2, 0)) || 1

  const targetNorm = norm(targetTerms)
  const seenTitles = new Set<string>([(target.title || '').trim().toLowerCase()])

  const scored: { article: ClusterableArticle; score: number }[] = []

  for (const candidate of pool) {
    if (!candidate?.title || !candidate.url) continue
    if (candidate.url === target.url) continue

    // Feeds repeat identical headlines (Google News aggregates); one copy is enough.
    const key = candidate.title.trim().toLowerCase()
    if (seenTitles.has(key)) continue

    if (hoursBetween(target.publishedAt, candidate.publishedAt) > maxAgeHours) continue

    const candTerms = terms(stripOutletSuffix(candidate.title, candidate.source))
    if (candTerms.length < 2) continue

    const shared = targetTerms.filter(t => candTerms.includes(t))
    if (!shared.length) continue

    // Guard against matches carried entirely by generic domain vocabulary — an investing
    // feed shares "beleggen" across a third of its headlines.
    const distinctive = shared.filter(t => (df.get(t) || 1) <= distinctiveMaxDf)
    if (distinctive.length < minDistinctiveTerms) continue

    const dot = shared.reduce((s, t) => s + weightOf(t) ** 2, 0)
    const score = dot / (targetNorm * norm(candTerms))
    if (score < minScore) continue

    seenTitles.add(key)
    scored.push({ article: candidate, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.article)
}
