import Airtable from 'airtable'
import * as mockAirtable from './mock-airtable'

// Check if Airtable credentials are available
const hasAirtableCredentials = !!(process.env.AIRTABLE_TOKEN_NEWSPAL && process.env.AIRTABLE_BASE_NEWSPAL)

let base: any = null

if (hasAirtableCredentials) {
  try {
    base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN_NEWSPAL
    }).base(process.env.AIRTABLE_BASE_NEWSPAL || '')
    console.log('✅ Airtable initialized successfully')
  } catch (error) {
    console.warn('❌ Airtable initialization failed, using mock implementation')
    base = null
  }
} else {
  console.warn('⚠️ Airtable credentials not found, using mock implementation')
}

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

export async function createArticle(article: Omit<NewsArticle, 'id' | 'createdAt'>) {
  if (!base) {
    console.log('Using mock Airtable for createArticle')
    return await mockAirtable.createArticle(article)
  }

  try {
    console.log('Creating article in real Airtable:', article.title)
    const records = await base('Table 1').create([
      {
        fields: {
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          status: article.status,
          category: article.category,
          originalContent: article.originalContent || '',
          rewrittenContent: article.rewrittenContent || '',
          wordpressHtml: article.wordpressHtml || '',
          imageUrl: article.imageUrl || '',
        }
      }
    ])
    console.log('✅ Article created successfully in Airtable')
    return records[0]
  } catch (error) {
    console.error('❌ Error creating article in Airtable, falling back to mock:', error)
    return await mockAirtable.createArticle(article)
  }
}

export async function getArticles(status?: string, categories?: string | string[]): Promise<NewsArticle[]> {
  if (!base) {
    console.log('Using mock Airtable for getArticles')
    const articles = await mockAirtable.getArticles()
    // Apply filters on mock data
    let filtered = articles
    if (status) {
      filtered = filtered.filter(a => a.status === status)
    }
    if (categories) {
      const categoryArray = Array.isArray(categories) ? categories : [categories]
      filtered = filtered.filter(a => categoryArray.includes(a.category))
    }
    return filtered
  }

  try {
    console.log('Getting articles from real Airtable...')
    let filterFormula = ''
    const filters: string[] = []

    if (status) {
      filters.push(`{status} = '${status}'`)
    }

    if (categories) {
      const categoryArray = Array.isArray(categories) ? categories : [categories]
      if (categoryArray.length > 0) {
        const categoryFilters = categoryArray.map(cat => `{category} = '${cat}'`)
        if (categoryFilters.length > 1) {
          filters.push(`OR(${categoryFilters.join(', ')})`)
        } else {
          filters.push(categoryFilters[0])
        }
      }
    }

    if (filters.length > 0) {
      filterFormula = filters.length > 1 ? `AND(${filters.join(', ')})` : filters[0]
    }

    const records = await base('Table 1').select({
      ...(filterFormula && { filterByFormula: filterFormula }),
      sort: [{ field: 'publishedAt', direction: 'desc' }],
      maxRecords: 100
    }).all()

    const articles = records.map(record => ({
      id: record.id,
      title: record.fields.title as string,
      description: record.fields.description as string,
      url: record.fields.url as string,
      source: record.fields.source as string,
      publishedAt: record.fields.publishedAt as string,
      status: record.fields.status as NewsArticle['status'],
      category: record.fields.category as NewsArticle['category'],
      originalContent: record.fields.originalContent as string,
      rewrittenContent: record.fields.rewrittenContent as string,
      wordpressHtml: record.fields.wordpressHtml as string,
      imageUrl: record.fields.imageUrl as string,
      createdAt: record.fields.createdAt as string,
    }))
    console.log(`✅ Retrieved ${articles.length} articles from Airtable`)
    return articles
  } catch (error) {
    console.error('❌ Error fetching articles from Airtable, falling back to mock:', error)
    return await mockAirtable.getArticles()
  }
}

export async function updateArticle(id: string, updates: Partial<NewsArticle>): Promise<NewsArticle> {
  if (!base) {
    console.log('Using mock Airtable for updateArticle')
    return await mockAirtable.updateArticle(id, updates)
  }

  try {
    console.log(`Updating article ${id} in real Airtable`)
    const record = await base('Table 1').update(id, updates)
    console.log('✅ Article updated successfully in Airtable')

    return {
      id: record.id,
      ...record.fields,
    } as NewsArticle
  } catch (error) {
    console.error(`❌ Error updating article ${id} in Airtable, falling back to mock:`, error)
    return await mockAirtable.updateArticle(id, updates)
  }
}

export async function deleteArticle(id: string): Promise<void> {
  if (!base) {
    console.log('Using mock Airtable for deleteArticle')
    return await mockAirtable.deleteArticle(id)
  }

  try {
    console.log(`Deleting article ${id} from real Airtable`)
    await base('Table 1').destroy(id)
    console.log('✅ Article deleted successfully from Airtable')
  } catch (error) {
    console.error(`❌ Error deleting article ${id} from Airtable, falling back to mock:`, error)
    return await mockAirtable.deleteArticle(id)
  }
}