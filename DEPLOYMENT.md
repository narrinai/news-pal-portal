# News Pal - Deployment Guide

## 🚀 Quick Deployment

News Pal is ready for deployment on modern hosting platforms. The application has been built with production-ready features including:

- ✅ Built-in cron job system (no external services needed)
- ✅ Custom styled notification system  
- ✅ Responsive design with modern UI
- ✅ Image support for RSS feeds
- ✅ Comprehensive error handling
- ✅ TypeScript for type safety

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Airtable Account** - For storing articles and settings
2. **OpenAI API Key** - For AI article rewriting
3. **Hosting Platform** - (Vercel, Netlify, Railway, etc.)

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

### Required Variables
```bash
AIRTABLE_TOKEN_NEWSPAL=pat...    # Your Airtable Personal Access Token
AIRTABLE_BASE_NEWSPAL=app...     # Your Airtable Base ID
OPENAI_API_KEY=sk-...            # OpenAI API key for rewriting
PORTAL_PASSWORD=...              # Secure password for portal access
```

### Optional Variables
```bash
ENABLE_CRON=true                 # Enable daily news fetching
RSS_FEED_CONFIGS='[...]'         # Custom RSS feed configurations
NEWS_CATEGORIES='[...]'          # Custom news categories
```

## 🏗️ Platform-Specific Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   git remote add origin https://github.com/yourusername/news-pal.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables in Settings > Environment Variables
   - Deploy!

3. **Automatic Cron Jobs** (Optional)
   - The built-in cron system will work automatically
   - For external cron triggers, add to `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/daily-fetch",
         "schedule": "0 6 * * *"
       }
     ]
   }
   ```

### Netlify

1. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

2. **Environment Variables**
   - Add all required env vars in Site Settings > Environment Variables

3. **Functions** (Optional)
   - Netlify Functions will handle API routes automatically

### Railway

1. **Deploy from GitHub**
   - Connect your repository
   - Railway will auto-detect Next.js

2. **Environment Variables**
   - Add in Variables tab

3. **Domain**
   - Railway provides automatic HTTPS domain

## 🗄️ Database Setup (Airtable)

### 1. Create Airtable Base
1. Create a new Airtable base
2. Rename the default table to "Table 1"
3. Add these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| title | Single line text | Article title |
| description | Long text | Article description |
| url | URL | Article link |
| source | Single line text | RSS feed source |
| publishedAt | Date & time | Publication date |
| status | Single select | pending, selected, rewritten, published |
| category | Single select | cybersecurity-nl, cybersecurity-international, other |
| originalContent | Long text | Original article content |
| rewrittenContent | Long text | AI rewritten content |
| wordpressHtml | Long text | WordPress-ready HTML |
| imageUrl | URL | Article image URL |

### 2. Get API Credentials
1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Create a personal access token with `data.records:read` and `data.records:write` scopes
3. Copy the token to `AIRTABLE_TOKEN_NEWSPAL`
4. Copy your base ID from the base URL to `AIRTABLE_BASE_NEWSPAL`

## 🔄 Cron Jobs & Automation

The application includes a built-in cron system that automatically:

- Fetches news articles daily at 6:00 AM (Europe/Amsterdam timezone)
- Processes all enabled RSS feeds
- Filters for relevant content using keywords
- Stores new articles in Airtable
- Avoids duplicates

### Manual Testing
```bash
# Test cron system locally
curl -X POST http://localhost:3000/api/cron/trigger

# Check cron status
curl http://localhost:3000/api/cron/status
```

## 🎨 Customization

### RSS Feeds
Add custom RSS feeds through the admin settings or environment variables:

```bash
RSS_FEED_CONFIGS='[
  {
    "url": "https://example.com/rss",
    "name": "Example News", 
    "category": "tech-nl",
    "enabled": true,
    "maxArticles": 10,
    "keywords": ["tech", "innovation"]
  }
]'
```

### AI Instructions
Customize rewriting prompts:

```bash
AI_INSTRUCTION_PROFESSIONAL="Use a business-focused tone..."
AI_INSTRUCTION_ENGAGING="Write in an engaging way..."
```

## 🔍 Monitoring

### Health Checks
- `/api/test` - Environment variable check
- `/api/test-airtable` - Airtable connectivity
- `/api/cron/status` - Cron job status

### Logs
Check platform logs for:
- `[CRON]` - Cron job execution
- `[AUTO-START]` - Automatic cron startup
- Article fetch and creation operations

## 🔒 Security

- All API routes are protected
- Password authentication for portal access
- Environment variables for sensitive data
- HTTPS enforced in production
- Input validation and sanitization

## 🚨 Troubleshooting

### Common Issues

**Build Errors**
```bash
npm run build  # Check for TypeScript errors
```

**Environment Variables**
```bash
# Verify all required vars are set
curl https://yourdomain.com/api/test
```

**Cron Not Running**
```bash
# Check status
curl https://yourdomain.com/api/cron/status

# Manual trigger
curl -X POST https://yourdomain.com/api/cron/trigger
```

## 🎯 Post-Deployment

1. **Test Login** - Visit your deployed URL and test portal access
2. **Verify Cron** - Check `/api/cron/status` endpoint
3. **Test Article Fetch** - Use "Nieuwe Artikelen Ophalen" button
4. **Configure RSS Feeds** - Add/remove feeds in Settings
5. **Test AI Rewriting** - Select an article and test rewrite functionality

Your News Pal instance is now ready for production use! 🎉