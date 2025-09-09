export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Load settings from environment variables or defaults
    try {
      const settings = {
        categories: process.env.NEWS_CATEGORIES ? 
          JSON.parse(process.env.NEWS_CATEGORIES) : 
          ['cybersecurity-nl', 'cybersecurity-international', 'tech-nl', 'tech-international', 'other'],
        
        rewriteInstructions: {
          general: process.env.AI_INSTRUCTION_GENERAL || `Herschrijf dit artikel naar helder Nederlands voor een technische doelgroep. Behoud alle belangrijke feiten en cijfers. 

WORDPRESS HTML FORMAT VEREIST:
- Gebruik <h2> voor hoofdsecties
- Gebruik <p> voor paragrafen  
- Gebruik <ul><li> voor opsommingen
- Gebruik <strong> voor belangrijke punten
- Gebruik <em> voor nadruk
- Voeg geen <h1> toe (wordt door WordPress toegevoegd)

Voorbeeld gewenste output structuur:
<h2>Wat is er gebeurd?</h2>
<p>Beschrijving van het incident...</p>

<h2>Impact en gevolgen</h2>
<ul>
<li><strong>Getroffen systemen:</strong> Details</li>
<li><strong>Potentiële schade:</strong> Uitleg</li>
</ul>

<h2>Wat kun je doen?</h2>
<p>Praktische adviezen...</p>`,
          
          professional: process.env.AI_INSTRUCTION_PROFESSIONAL || `Gebruik een zakelijke, professionele toon. Focus op de business impact en relevantie.

WORDPRESS HTML FORMAT - Zakelijke stijl:
<h2>Executive Summary</h2>
<p>Korte samenvatting voor management...</p>

<h2>Business Impact</h2>
<ul>
<li><strong>Financiële gevolgen:</strong> Details</li>
<li><strong>Operationele risico's:</strong> Uitleg</li>
</ul>

<h2>Aanbevelingen</h2>
<p>Concrete actiepunten voor beslissers...</p>`,
          
          engaging: process.env.AI_INSTRUCTION_ENGAGING || `Schrijf op een boeiende manier die lezers betrekt. Gebruik voorbeelden en maak het toegankelijk.

WORDPRESS HTML FORMAT - Toegankelijke stijl:
<h2>Wat betekent dit voor jou?</h2>
<p>Praktische uitleg met voorbeelden...</p>

<h2>De belangrijkste punten</h2>
<ul>
<li><strong>In gewone taal:</strong> Eenvoudige uitleg</li>
<li><strong>Waarom belangrijk:</strong> Relevantie voor lezer</li>
</ul>

<h2>Volgende stappen</h2>
<p>Heldere actiepunten...</p>`,
          
          technical: process.env.AI_INSTRUCTION_TECHNICAL || `Gebruik technische precisie en gedetailleerde uitleg. Voeg technische context toe waar relevant.

WORDPRESS HTML FORMAT - Technische stijl:
<h2>Technische Details</h2>
<p>Diepgaande technische analyse...</p>

<h2>Kwetsbaarheden en Exploits</h2>
<ul>
<li><strong>CVE nummers:</strong> Specifieke referenties</li>
<li><strong>Affected systems:</strong> Technische details</li>
<li><strong>Attack vectors:</strong> Uitleg van aanvalsmethoden</li>
</ul>

<h2>Mitigatie en Patches</h2>
<p>Technische oplossingen en configuraties...</p>`
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