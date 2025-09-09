export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Load settings from environment variables or defaults
    try {
      const settings = {
        categories: process.env.NEWS_CATEGORIES ? 
          JSON.parse(process.env.NEWS_CATEGORIES) : 
          ['cybersecurity-nl', 'cybersecurity-international', 'tech-nl', 'tech-international', 'other'],
        
        rewriteInstructions: {
          general: process.env.AI_INSTRUCTION_GENERAL || 'Herschrijf dit artikel naar helder Nederlands voor een technische doelgroep. Behoud alle belangrijke feiten en cijfers.',
          professional: process.env.AI_INSTRUCTION_PROFESSIONAL || 'Gebruik een zakelijke, professionele toon. Focus op de business impact en relevantie.',
          engaging: process.env.AI_INSTRUCTION_ENGAGING || 'Schrijf op een boeiende manier die lezers betrekt. Gebruik voorbeelden en maak het toegankelijk.',
          technical: process.env.AI_INSTRUCTION_TECHNICAL || 'Gebruik technische precisie en gedetailleerde uitleg. Voeg technische context toe waar relevant.'
        }
      }
      
      return res.status(200).json(settings)
    } catch (error) {
      console.error('Error loading settings:', error)
      return res.status(500).json({ error: 'Failed to load settings' })
    }
  }

  if (req.method === 'POST') {
    // For now, we'll just return success - later we can store in Airtable
    try {
      const { categories, rewriteInstructions } = req.body
      
      console.log('Settings update requested:')
      console.log('Categories:', categories)
      console.log('Instructions:', Object.keys(rewriteInstructions))
      
      // TODO: Store settings in Airtable or another persistent storage
      // For now we'll just log them
      
      return res.status(200).json({ 
        success: true, 
        message: 'Settings saved (logged to console for now)' 
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      return res.status(500).json({ error: 'Failed to save settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}