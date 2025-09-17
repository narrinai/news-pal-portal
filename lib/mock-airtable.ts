// Mock Airtable implementation for when API keys are not available
export interface NewsArticle {
  id?: string
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  status: 'pending' | 'selected' | 'rewritten' | 'published'
  category: 'cybersecurity' | 'bouwcertificaten' | 'ai-companion' | 'ai-learning' | 'marketingtoolz'
  originalContent?: string
  rewrittenContent?: string
  wordpressHtml?: string
  imageUrl?: string
  wordpressUrl?: string
  wordpressPostId?: string
  createdAt?: string
}

// In-memory storage for development
let mockArticles: NewsArticle[] = []
let nextId = 1

export async function createArticle(article: Omit<NewsArticle, 'id' | 'createdAt'>): Promise<any> {
  const newArticle: NewsArticle = {
    ...article,
    id: `mock_${nextId++}`,
    createdAt: new Date().toISOString()
  }

  mockArticles.push(newArticle)
  console.log(`Mock: Created article ${newArticle.id} - ${newArticle.title}`)

  return {
    id: newArticle.id,
    fields: newArticle
  }
}

export async function getArticles(): Promise<NewsArticle[]> {
  console.log(`Mock: Retrieved ${mockArticles.length} articles`)
  return mockArticles.map(article => ({
    ...article,
    id: article.id!
  }))
}

export async function updateArticle(id: string, updates: Partial<NewsArticle>): Promise<NewsArticle> {
  const articleIndex = mockArticles.findIndex(a => a.id === id)

  if (articleIndex === -1) {
    throw new Error(`Article with id ${id} not found`)
  }

  mockArticles[articleIndex] = {
    ...mockArticles[articleIndex],
    ...updates
  }

  console.log(`Mock: Updated article ${id}`)
  return mockArticles[articleIndex]
}

export async function deleteArticle(id: string): Promise<void> {
  const articleIndex = mockArticles.findIndex(a => a.id === id)

  if (articleIndex === -1) {
    throw new Error(`Article with id ${id} not found`)
  }

  mockArticles.splice(articleIndex, 1)
  console.log(`Mock: Deleted article ${id}`)
}