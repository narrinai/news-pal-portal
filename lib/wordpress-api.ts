// WordPress REST API Integration for marketingtoolz.nl

export interface WordPressPost {
  title: string
  content: string
  status: 'draft' | 'publish'
  categories?: number[]
  tags?: number[]
  excerpt?: string
  meta?: {
    [key: string]: any
  }
}

export interface WordPressConfig {
  siteUrl: string
  username: string
  applicationPassword: string
  defaultCategory?: number
  defaultStatus: 'draft' | 'publish'
}

export class WordPressAPI {
  private config: WordPressConfig

  constructor(config: WordPressConfig) {
    this.config = config
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.applicationPassword}`
    return `Basic ${Buffer.from(credentials).toString('base64')}`
  }

  async testConnection(): Promise<{ success: boolean; message: string; siteInfo?: any }> {
    try {
      const response = await fetch(`${this.config.siteUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userInfo = await response.json()
        return {
          success: true,
          message: 'WordPress connection successful',
          siteInfo: {
            username: userInfo.name,
            email: userInfo.email,
            roles: userInfo.roles
          }
        }
      } else {
        return {
          success: false,
          message: `WordPress connection failed: ${response.status} ${response.statusText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `WordPress connection error: ${error.message}`
      }
    }
  }

  async publishPost(post: WordPressPost): Promise<{ success: boolean; message: string; postUrl?: string; postId?: number }> {
    try {
      const postData = {
        title: post.title,
        content: post.content,
        status: post.status,
        excerpt: post.excerpt || '',
        categories: post.categories || (this.config.defaultCategory ? [this.config.defaultCategory] : []),
        tags: post.tags || [],
        meta: post.meta || {}
      }

      const response = await fetch(`${this.config.siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      if (response.ok) {
        const createdPost = await response.json()
        return {
          success: true,
          message: `Post ${post.status === 'publish' ? 'published' : 'saved as draft'} successfully`,
          postUrl: createdPost.link,
          postId: createdPost.id
        }
      } else {
        const errorData = await response.text()
        return {
          success: false,
          message: `WordPress publish failed: ${response.status} - ${errorData}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `WordPress publish error: ${error.message}`
      }
    }
  }

  async getCategories(): Promise<{ id: number; name: string; slug: string }[]> {
    try {
      const response = await fetch(`${this.config.siteUrl}/wp-json/wp/v2/categories?per_page=100`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const categories = await response.json()
        return categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching WordPress categories:', error)
      return []
    }
  }

  async createCategory(name: string, description?: string): Promise<{ success: boolean; categoryId?: number; message: string }> {
    try {
      const response = await fetch(`${this.config.siteUrl}/wp-json/wp/v2/categories`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description: description || '',
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        })
      })

      if (response.ok) {
        const category = await response.json()
        return {
          success: true,
          categoryId: category.id,
          message: `Category '${name}' created successfully`
        }
      } else {
        const errorData = await response.text()
        return {
          success: false,
          message: `Failed to create category: ${errorData}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error creating category: ${error.message}`
      }
    }
  }
}

export function createWordPressAPI(): WordPressAPI | null {
  const siteUrl = process.env.WORDPRESS_SITE_URL || 'https://www.marketingtoolz.com'
  const username = process.env.WORDPRESS_USERNAME
  const applicationPassword = process.env.WORDPRESS_APP_PASSWORD
  const defaultCategory = process.env.WORDPRESS_DEFAULT_CATEGORY ? 
    parseInt(process.env.WORDPRESS_DEFAULT_CATEGORY) : undefined

  if (!username || !applicationPassword) {
    console.error('WordPress credentials not configured')
    return null
  }

  return new WordPressAPI({
    siteUrl,
    username,
    applicationPassword,
    defaultCategory,
    defaultStatus: 'draft' // Safe default
  })
}