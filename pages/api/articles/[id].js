import { updateArticle } from '../../../lib/airtable'

export default async function handler(req, res) {
  console.log('Article request:', req.method, req.query.id)
  
  if (req.method === 'PATCH') {
    // Update article
    return handleUpdate(req, res)
  }
  
  if (req.method === 'DELETE') {
    // Delete article (deselect)
    return handleDelete(req, res)
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleUpdate(req, res) {

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

async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    console.log('Deleting article:', id)
    
    const { deleteArticle } = require('../../../lib/airtable')
    await deleteArticle(id)
    
    console.log('Article deleted successfully:', id)
    return res.status(200).json({ 
      success: true,
      message: 'Article deselected and removed from collection' 
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ 
      error: 'Failed to deselect article', 
      details: error.message 
    });
  }
}