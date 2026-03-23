// Mock Airtable implementation for when API keys are not available
export interface NewsArticle {
  id?: string
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  status: 'pending' | 'selected' | 'rewritten' | 'published'
  category: string
  topic?: string
  originalContent?: string
  content_rewritten?: string
  content_html?: string
  imageUrl?: string
  wordpressUrl?: string
  wordpressPostId?: string
  automation_id?: string
  createdAt?: string
}

export interface Automation {
  id?: string
  name: string
  enabled: boolean
  articles_per_day: number
  publish_frequency?: 'daily' | 'every-2-days' | 'every-3-days' | 'weekly' | 'biweekly' | 'monthly'
  categories: string
  style: string
  length: string
  language: string
  keywords?: string
  feeds?: string
  site_name?: string
  site_url?: string
  site_example_url?: string
  site_template?: string
  site_detail_template?: string
  integration_type?: 'script-tag' | 'fetch-api' | 'build-time' | 'netlify-function'
  deploy_webhook_url?: string
  replit_url?: string
}

// In-memory storage for development
let mockArticles: NewsArticle[] = []
let mockAutomations: Automation[] = []
let nextId = 1
let nextAutoId = 1

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

// ── Automations ──────────────────────────────────────────────────────

export async function getAutomations(): Promise<Automation[]> {
  return mockAutomations.map(a => ({ ...a }))
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const found = mockAutomations.find(a => a.id === id)
  return found ? { ...found } : null
}

export async function createAutomation(data: Omit<Automation, 'id'>): Promise<Automation> {
  const automation: Automation = {
    ...data,
    id: `mock_auto_${nextAutoId++}`,
  }
  mockAutomations.push(automation)
  console.log(`Mock: Created automation ${automation.id} - ${automation.name}`)
  return { ...automation }
}

export async function updateAutomation(id: string, data: Partial<Automation>): Promise<Automation> {
  const index = mockAutomations.findIndex(a => a.id === id)
  if (index === -1) {
    throw new Error(`Automation with id ${id} not found`)
  }
  mockAutomations[index] = { ...mockAutomations[index], ...data }
  console.log(`Mock: Updated automation ${id}`)
  return { ...mockAutomations[index] }
}

export async function deleteAutomation(id: string): Promise<void> {
  const index = mockAutomations.findIndex(a => a.id === id)
  if (index === -1) {
    throw new Error(`Automation with id ${id} not found`)
  }
  mockAutomations.splice(index, 1)
  console.log(`Mock: Deleted automation ${id}`)
}
