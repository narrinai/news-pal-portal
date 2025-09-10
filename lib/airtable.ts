import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_NEWSPAL
}).base(process.env.AIRTABLE_BASE_NEWSPAL || '')

export interface NewsArticle {
  id?: string
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  status: 'pending' | 'selected' | 'rewritten' | 'published'
  category: 'cybersecurity' | 'bouwcertificaten-nl' | 'ai-companion-international' | 'ai-learning-international'
  originalContent?: string
  rewrittenContent?: string
  wordpressHtml?: string
  imageUrl?: string
  wordpressUrl?: string
  wordpressPostId?: string
  createdAt?: string
}

export async function createArticle(article: Omit<NewsArticle, 'id' | 'createdAt'>) {
  try {
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
    return records[0]
  } catch (error) {
    console.error('Error creating article:', error)
    throw error
  }
}

export async function getArticles(status?: string, categories?: string | string[]): Promise<NewsArticle[]> {
  try {
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

    return records.map(record => ({
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
  } catch (error) {
    console.error('Error fetching articles:', error)
    throw error
  }
}

export async function updateArticle(id: string, updates: Partial<NewsArticle>) {
  try {
    const record = await base('Table 1').update(id, updates)
    return record
  } catch (error) {
    console.error('Error updating article:', error)
    throw error
  }
}

export async function deleteArticle(id: string) {
  try {
    await base('Table 1').destroy(id)
    return true
  } catch (error) {
    console.error('Error deleting article:', error)
    throw error
  }
}