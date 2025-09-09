import { getArticles } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, category } = req.query;
    console.log(`Fetching articles with status: ${status}, category: ${category}`)
    
    const articles = await getArticles(status, category);
    console.log(`Retrieved ${articles.length} articles from Airtable`)
    
    return res.status(200).json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch articles', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}