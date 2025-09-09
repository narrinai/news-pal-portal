import { updateArticle } from '../../../lib/airtable'

export default async function handler(req, res) {
  console.log('Article update request:', req.method, req.query.id)
  
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const updates = req.body;
    
    console.log('Updating article:', id, 'with:', updates)
    
    const updatedArticle = await updateArticle(id, updates);
    
    console.log('Article updated successfully:', id)
    return res.status(200).json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({ 
      error: 'Failed to update article', 
      details: error.message 
    });
  }
}