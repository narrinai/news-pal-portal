import { discoverFromTags, TAG_MAPPINGS } from '../../../lib/tag-feed-mapping'
import { DEFAULT_RSS_FEEDS } from '../../../lib/feed-manager'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tags } = req.body

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'tags array is required' })
  }

  try {
    const { feeds: feedIds, keywords, categories } = discoverFromTags(tags)

    // Resolve feed IDs to full feed configs
    const feedMap = new Map(DEFAULT_RSS_FEEDS.map(f => [f.id, f]))
    const resolvedFeeds = feedIds
      .map(id => feedMap.get(id))
      .filter(Boolean)

    // Check which tags had no mapping
    const unmappedTags = tags.filter(tag => !TAG_MAPPINGS[tag.toLowerCase().trim()])

    return res.status(200).json({
      success: true,
      feeds: resolvedFeeds,
      feedIds,
      keywords,
      categories,
      unmappedTags,
      summary: {
        totalFeeds: resolvedFeeds.length,
        totalKeywords: keywords.length,
        totalCategories: categories.length,
        mappedTags: tags.length - unmappedTags.length,
        unmappedTags: unmappedTags.length,
      },
    })
  } catch (error) {
    console.error('[discover-feeds] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to discover feeds' })
  }
}
