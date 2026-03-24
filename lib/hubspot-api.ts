// HubSpot CMS Blog API Integration

export interface HubSpotPost {
  title: string
  content: string
  metaDescription?: string
  featuredImageUrl?: string
  status: 'DRAFT' | 'PUBLISHED'
  tags?: string[]
}

export interface HubSpotConfig {
  accessToken: string
}

export class HubSpotAPI {
  private accessToken: string
  private baseUrl = 'https://api.hubapi.com'

  constructor(config: HubSpotConfig) {
    this.accessToken = config.accessToken
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; portalInfo?: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/cms/v3/blogs?limit=1`, {
        headers: this.headers,
      })

      if (res.ok) {
        const data = await res.json()
        const blog = data.results?.[0]
        return {
          success: true,
          message: blog
            ? `Verbonden met HubSpot — blog "${blog.name}" gevonden`
            : 'Verbonden met HubSpot (geen blog gevonden, maak er eerst één aan)',
          portalInfo: blog ? { blogId: blog.id, blogName: blog.name, blogUrl: blog.absoluteUrl } : null,
        }
      } else {
        const err = await res.text()
        return {
          success: false,
          message: `HubSpot verbinding mislukt (${res.status}): ${err}`,
        }
      }
    } catch (error: any) {
      return { success: false, message: `Verbindingsfout: ${error.message}` }
    }
  }

  async getFirstBlogId(): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/cms/v3/blogs?limit=1`, {
        headers: this.headers,
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.results?.[0]?.id ?? null
    } catch {
      return null
    }
  }

  async publishPost(post: HubSpotPost, blogId?: string): Promise<{ success: boolean; message: string; postUrl?: string; postId?: string }> {
    try {
      const contentGroupId = blogId || (await this.getFirstBlogId())
      if (!contentGroupId) {
        return { success: false, message: 'Geen HubSpot blog gevonden. Maak eerst een blog aan in HubSpot.' }
      }

      const body: any = {
        name: post.title,
        htmlTitle: post.title,
        postBody: post.content,
        contentGroupId,
        state: post.status,
      }
      if (post.metaDescription) body.metaDescription = post.metaDescription
      if (post.featuredImageUrl) {
        body.featuredImage = post.featuredImageUrl
        body.useFeaturedImage = true
      }

      const res = await fetch(`${this.baseUrl}/cms/v3/blogs/posts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const created = await res.json()
        return {
          success: true,
          message: `Artikel ${post.status === 'PUBLISHED' ? 'gepubliceerd' : 'opgeslagen als concept'} in HubSpot`,
          postUrl: created.url,
          postId: created.id,
        }
      } else {
        const err = await res.text()
        return { success: false, message: `HubSpot publish mislukt (${res.status}): ${err}` }
      }
    } catch (error: any) {
      return { success: false, message: `HubSpot publish fout: ${error.message}` }
    }
  }
}
