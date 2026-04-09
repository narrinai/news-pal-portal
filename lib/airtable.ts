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
  category: string
  topic?: string
  originalContent?: string
  content_rewritten?: string
  content_html?: string
  imageUrl?: string
  subtitle?: string
  faq?: string
  wordpressUrl?: string
  wordpressPostId?: string
  matchedKeywords?: string[]
  automation_id?: string
  focus_keyword?: string
  meta_description?: string
  seo_keywords?: string
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
  site_platform?: 'netlify' | 'wordpress' | 'replit' | 'hubspot' | 'other'
  site_api_key?: string
  replit_url?: string
  tags?: string
  target_audience?: string
  extra_context?: string
  analyze_urls?: string
  pipeline_hour?: number
  auto_schedule?: boolean
  ai_settings?: string
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
          content_rewritten: article.content_rewritten || '',
          content_html: article.content_html || '',
          imageUrl: article.imageUrl || '',
          matchedKeywords: article.matchedKeywords ? article.matchedKeywords.join(', ') : '',
          ...(article.automation_id ? { automation_id: article.automation_id } : {}),
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

export async function getArticles(status?: string, categories?: string | string[], automationId?: string): Promise<NewsArticle[]> {
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
    if (automationId) {
      filtered = filtered.filter(a => (a as any).automation_id === automationId)
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

    if (automationId) {
      filters.push(`{automation_id} = '${automationId}'`)
    }

    if (filters.length > 0) {
      filterFormula = filters.length > 1 ? `AND(${filters.join(', ')})` : filters[0]
    }

    const records = await base('Table 1').select({
      ...(filterFormula && { filterByFormula: filterFormula }),
      sort: [{ field: 'publishedAt', direction: 'desc' }],
      maxRecords: automationId ? 500 : 100
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
      content_rewritten: record.fields.content_rewritten as string,
      content_html: record.fields.content_html as string,
      imageUrl: record.fields.imageUrl as string,
      subtitle: record.fields.subtitle as string,
      faq: record.fields.faq as string,
      matchedKeywords: record.fields.matchedKeywords
        ? (record.fields.matchedKeywords as string).split(', ').filter(k => k.trim())
        : [],
      automation_id: record.fields.automation_id as string | undefined,
      focus_keyword: record.fields.focus_keyword as string | undefined,
      meta_description: record.fields.meta_description as string | undefined,
      seo_keywords: record.fields.seo_keywords as string | undefined,
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
  } catch (error: any) {
    console.error(`❌ Error updating article ${id} in Airtable:`, error?.message || error)
    throw new Error(`Failed to update article in Airtable: ${error?.message || 'Unknown error'}`)
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

// ── Automations (multi-pipeline) ─────────────────────────────────────

const defaultAutomation: Omit<Automation, 'id'> = {
  name: 'Default Automation',
  enabled: false,
  articles_per_day: 1,
  categories: 'cybersecurity,ai-companion',
  style: 'news',
  length: 'extra-long',
  language: 'en',
}

function recordToAutomation(record: any): Automation {
  const f = record.fields
  return {
    id: record.id,
    name: (f.name as string) || 'Unnamed',
    enabled: !!f.enabled,
    articles_per_day: (f.articles_per_day as number) || 1,
    categories: (f.categories as string) || '',
    style: (f.style as string) || 'news',
    length: (f.length as string) || 'extra-long',
    language: (f.language as string) || 'en',
    publish_frequency: (f.publish_frequency as Automation['publish_frequency']) || 'daily',
    keywords: (f.keywords as string) || '',
    feeds: (f.feeds as string) || '',
    site_name: (f.site_name as string) || '',
    site_url: (f.site_url as string) || '',
    site_example_url: (f.site_example_url as string) || '',
    site_template: (f.site_template as string) || '',
    site_detail_template: (f.site_detail_template as string) || '',
    integration_type: (f.integration_type as Automation['integration_type']) || undefined,
    deploy_webhook_url: (f.deploy_webhook_url as string) || '',
    site_platform: (f.site_platform as Automation['site_platform']) || undefined,
    site_api_key: (f.site_api_key as string) || '',
    replit_url: (f.replit_url as string) || '',
    tags: (f.tags as string) || '',
    target_audience: (f.target_audience as string) || '',
    extra_context: (f.extra_context as string) || '',
    analyze_urls: (f.analyze_urls as string) || '',
    ai_settings: (f.ai_settings as string) || '',
  }
}

export async function getAutomations(): Promise<Automation[]> {
  if (!base) {
    return mockAirtable.getAutomations()
  }

  try {
    const records = await base('automation_settings').select({}).all()
    console.log(`[AUTOMATIONS] Found ${records.length} records in automation_settings`)
    return records.map(recordToAutomation)
  } catch (error: any) {
    console.error('[AUTOMATIONS] Error fetching from automation_settings:', error?.message || error, error?.statusCode)
    return mockAirtable.getAutomations()
  }
}

export async function getAutomation(id: string): Promise<Automation | null> {
  if (!base) {
    return mockAirtable.getAutomation(id)
  }

  try {
    const record = await base('automation_settings').find(id)
    return recordToAutomation(record)
  } catch (error) {
    console.error(`Error fetching automation ${id}:`, error)
    return null
  }
}

export async function createAutomation(data: Omit<Automation, 'id'>): Promise<Automation> {
  if (!base) {
    return mockAirtable.createAutomation(data)
  }

  try {
    // Clean empty strings for singleSelect and url fields
    const cleaned: Record<string, any> = { ...data }
    const selectFields = ['integration_type', 'publish_frequency', 'site_platform']
    const urlFields = ['site_url', 'deploy_webhook_url', 'replit_url']
    for (const key of [...selectFields, ...urlFields]) {
      if (key in cleaned && cleaned[key] === '') {
        delete cleaned[key]
      }
    }
    const records = await base('automation_settings').create([{ fields: cleaned }])
    return recordToAutomation(records[0])
  } catch (error) {
    console.error('Error creating automation:', error)
    return mockAirtable.createAutomation(data)
  }
}

export async function updateAutomation(id: string, data: Partial<Automation>): Promise<Automation> {
  if (!base) {
    return mockAirtable.updateAutomation(id, data)
  }

  try {
    const { id: _id, ...fields } = data

    // Only send fields that exist as columns in Airtable automation_settings
    const KNOWN_FIELDS = new Set([
      'name', 'enabled', 'articles_per_day', 'publish_frequency',
      'categories', 'style', 'length', 'language',
      'keywords', 'feeds', 'tags', 'target_audience',
      'site_name', 'site_url', 'site_example_url',
      'site_template', 'site_detail_template',
      'integration_type', 'deploy_webhook_url',
      'site_platform', 'site_api_key', 'replit_url',
      'extra_context', 'analyze_urls', 'ai_settings',
    ])

    const cleaned: Record<string, any> = {}
    for (const [key, val] of Object.entries(fields)) {
      if (!KNOWN_FIELDS.has(key)) continue
      cleaned[key] = val
    }

    // Airtable requires null (not empty string) to clear singleSelect and url fields
    const selectFields = ['integration_type', 'publish_frequency', 'site_platform']
    const urlFields = ['site_url', 'deploy_webhook_url', 'replit_url']
    for (const key of [...selectFields, ...urlFields]) {
      if (key in cleaned && cleaned[key] === '') {
        cleaned[key] = null
      }
    }

    const record = await base('automation_settings').update(id, cleaned)
    return recordToAutomation(record)
  } catch (error: any) {
    console.error(`Error updating automation ${id}:`, error?.message || error)
    // If Airtable rejects unknown fields, retry with only base fields
    if (error?.message?.includes('UNKNOWN_FIELD_NAME') || error?.statusCode === 422) {
      throw error
    }
    return mockAirtable.updateAutomation(id, data)
  }
}

export async function deleteAutomation(id: string): Promise<void> {
  if (!base) {
    return mockAirtable.deleteAutomation(id)
  }

  try {
    await base('automation_settings').destroy(id)
  } catch (error) {
    console.error(`Error deleting automation ${id}:`, error)
    return mockAirtable.deleteAutomation(id)
  }
}

// ── Backward-compat: old AutomationSettings API ─────────────────────

export interface AutomationSettings {
  enabled: boolean
  articles_per_day: number
  categories: string
  style: string
  length: string
  language: string
  tone: string
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const automations = await getAutomations()
  const first = automations[0]
  if (!first) {
    return { ...defaultAutomation, tone: 'informative' } as AutomationSettings
  }
  return {
    enabled: first.enabled,
    articles_per_day: first.articles_per_day,
    categories: first.categories,
    style: first.style,
    length: first.length,
    language: first.language,
    tone: 'informative',
  }
}

export async function saveAutomationSettings(settings: AutomationSettings): Promise<AutomationSettings> {
  const automations = await getAutomations()
  const { tone, ...rest } = settings
  if (automations.length === 0) {
    await createAutomation({ name: 'Default Automation', ...rest })
  } else {
    await updateAutomation(automations[0].id!, rest)
  }
  return settings
}