import { getArticles, updateArticle } from '../../lib/airtable'

// Import the keyword map from settings
const CATEGORY_KEYWORDS = {
  'ai-companion': [
    'AI', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
    'chatbot', 'virtual assistant', 'natural language', 'NLP', 'computer vision',
    'generative AI', 'GPT', 'transformer', 'language model', 'LLM',
    'OpenAI', 'ChatGPT', 'Claude', 'Anthropic', 'Google AI', 'Gemini', 'Bard',
    'Microsoft Copilot', 'GitHub Copilot', 'Midjourney', 'DALL-E', 'Stable Diffusion',
    'AI model', 'training', 'inference', 'prompt', 'fine-tuning', 'AGI',
    'conversational AI', 'AI agent', 'autonomous', 'intelligent system',
    'AI companion', 'AI assistant', 'AI girlfriend', 'AI boyfriend', 'virtual companion',
    'character AI', 'personality AI', 'emotional AI', 'companion robot', 'social robot',
    'automation', 'robot', 'algorithm', 'neural', 'cognitive', 'intelligent',
    'smart technology', 'voice assistant', 'Alexa', 'Siri', 'recommendation',
    'personalization', 'prediction', 'analytics', 'data science',
    'Replika', 'Character.AI', 'Chai', 'Anima', 'EVA AI', 'Nomi', 'Paradot',
    'Kuki', 'Mitsuku', 'Xiaoice', 'Crushon.AI', 'Janitor AI', 'Candy.ai', 'DreamGF',
    'Botify', 'Kajiwoto', 'SimSimi', 'Cleverbot', 'Pi', 'Inflection', 'Poe',
    'Cortana', 'Bixby', 'Clova', 'Mycroft',
    'Woebot', 'Wysa', 'Youper', 'Tess',
    'Kupid', 'Caryn AI', 'MyAnima', 'Soulmate AI', 'Luka',
    'Lil Miquela', 'virtual influencer', 'digital avatar'
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Starting keyword backfill...')

    // Get all articles
    const articles = await getArticles()
    console.log(`Found ${articles.length} articles to process`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const article of articles) {
      try {
        // Skip if already has keywords
        if (article.matchedKeywords && article.matchedKeywords.length > 0) {
          skipped++
          continue
        }

        // Get keywords for this category
        const categoryKeywords = CATEGORY_KEYWORDS[article.category] || []

        if (categoryKeywords.length === 0) {
          console.log(`No keywords defined for category: ${article.category}`)
          skipped++
          continue
        }

        // Match keywords in title and description
        const content = (article.title + ' ' + article.description).toLowerCase()
        const matchedKeywords = categoryKeywords.filter(keyword =>
          content.includes(keyword.toLowerCase())
        )

        if (matchedKeywords.length > 0) {
          // Update article with matched keywords
          await updateArticle(article.id, {
            matchedKeywords: matchedKeywords.join(', ')
          })

          console.log(`✅ Updated "${article.title.substring(0, 50)}..." with ${matchedKeywords.length} keywords`)
          updated++
        } else {
          console.log(`⚠️ No keywords matched for "${article.title.substring(0, 50)}..."`)
          skipped++
        }

      } catch (error) {
        console.error(`Error updating article ${article.id}:`, error)
        errors++
      }
    }

    return res.status(200).json({
      success: true,
      message: `Keyword backfill completed`,
      stats: {
        total: articles.length,
        updated,
        skipped,
        errors
      }
    })

  } catch (error) {
    console.error('Error in keyword backfill:', error)
    return res.status(500).json({
      error: 'Failed to backfill keywords',
      details: error.message
    })
  }
}
