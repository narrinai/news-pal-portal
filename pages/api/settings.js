export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Load settings from environment variables or defaults
    try {
      const settings = {
        categories: process.env.NEWS_CATEGORIES ? 
          JSON.parse(process.env.NEWS_CATEGORIES) : 
          ['cybersecurity', 'bouwcertificaten', 'ai-companion', 'ai-learning'],
        
        categoryKeywords: process.env.CATEGORY_KEYWORDS ?
          JSON.parse(process.env.CATEGORY_KEYWORDS) : {
            'cybersecurity': [
              // Combined Dutch + International Security Keywords
              'beveiliging', 'cyberbeveiliging', 'cybersecurity', 'cyber security', 'datalek', 'privacy', 'hack', 'hacker', 'malware', 
              'ransomware', 'phishing', 'spear phishing', 'virus', 'trojan', 'spyware', 'adware', 'botnet', 'ddos', 'firewall',
              'antivirus', 'encryptie', 'encryption', 'vpn', 'virtual private network', 'ssl', 'tls', 'certificaat', 'certificate', 'kwetsbaarheid',
              'vulnerability', 'exploit', 'patch', 'update', 'beveiligingslek', 'cyberaanval', 'attack', 'cyber attack', 'cyberattack',
              'threat', 'dreging', 'risico', 'risk', 'incident', 'breach', 'data breach', 'inbreuk', 'lekken', 'leak',
              'cybercrime', 'cybercriminaliteit', 'fraude', 'fraud', 'identiteitsdiefstal', 'identity theft', 'social engineering',
              'twee-factor', 'multifactor', 'authenticatie', 'authentication', 'wachtwoord', 'password', 'biometric', 'toegangscontrole',
              'access control', 'gdpr', 'avg', 'compliance', 'audit', 'pentesting', 'penetration testing', 'pentest',
              'ethisch hacken', 'ethical hacking', 'white hat', 'black hat', 'red team', 'blue team', 'zero-day', 'zero day',
              'apt', 'advanced persistent threat', 'denial of service', 'soc', 'security operations center',
              'siem', 'endpoint protection', 'network security', 'application security', 'web security',
              'mobile security', 'cloud security', 'iot security', 'scada', 'industrial control',
              'forensics', 'digital forensics', 'worm', 'rootkit', 'backdoor', 'keylogger', 'c2', 'command control',
              'cve', 'cvss', 'nist', 'iso 27001', 'risk assessment', 'threat intelligence', 'threat hunting',
              'incident response', 'disaster recovery', 'business continuity', 'backup', 'authorization', 'iam',
              'credential', 'privilege escalation', 'lateral movement',
              
              // Cybersecurity Certifications
              'cissp', 'ccsp', 'sscp', 'csslp', 'hcispp', 'cgrc', 'cisa', 'cism', 'crisc', 'cgeit', 'cdpse',
              'cobit', 'cobit-di', 'ceh', 'chfi', 'cpent', 'cnd', 'cciso', 'ecih', 'security+', 'cysa+', 'pentest+', 'casp+',
              'gsec', 'gcih', 'gcia', 'gpen', 'gwapt', 'gcfe', 'gcfa', 'oscp', 'oswe', 'osep', 'osed', 'oswp',
              'sc-200', 'sc-300', 'sc-400', 'sc-100', 'az-500', 'aws-security', 'gcp-security',
              'cyberops associate', 'cyberops professional', 'ccnp security', 'ccie security',
              'cipp/e', 'cipm', 'cipt', 'isfs', 'iso27001-la', 'iso27001-li', 'iso27701', 'itil4', 'itil4-mp/sl',
              'certified ethical hacker', 'certified information systems auditor', 'certified information security manager',
              'certified information systems security professional', 'certified cloud security professional',
              'offensive security certified professional', 'comptia security', 'giac security', 'sans institute'
            ],
            'bouwcertificaten': [
              'bouwcertificaat', 'bouw certificaat', 'woningcertificaat', 'woning certificaat', 'energielabel',
              'energie label', 'bouwvergunning', 'bouw vergunning', 'woningbouw', 'woning bouw', 'certificering',
              'bouwtoezicht', 'bouw toezicht', 'bouwregelgeving', 'bouw regelgeving', 'bouwvoorschriften',
              'bouw voorschriften', 'woningwet', 'woning wet', 'bouwbesluit', 'bouw besluit', 'nta', 'nen',
              'keur', 'keuring', 'inspectie', 'bouwkundige', 'architect', 'constructeur', 'installateur'
            ],
            'ai-companion': [
              'AI companion', 'AI assistant', 'AI girlfriend', 'AI boyfriend', 'virtual assistant', 'virtual companion',
              'chatbot', 'chat bot', 'conversational AI', 'character AI', 'personality AI', 'emotional AI',
              'companion robot', 'social robot', 'humanoid', 'android', 'synthetic human', 'digital human',
              'avatar', 'virtual character', 'AI friend', 'AI relationship', 'digital companion', 'virtual being'
            ],
            'ai-learning': [
              'AI learning', 'artificial intelligence learning', 'machine learning', 'deep learning', 'neural networks',
              'AI education', 'AI training', 'AI tutorial', 'AI course', 'AI certification', 'AI bootcamp',
              'learn AI', 'study AI', 'AI curriculum', 'AI pedagogy', 'educational AI', 'AI literacy',
              'data science', 'data analytics', 'big data', 'statistics', 'algorithms', 'programming'
            ],
          },
        
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
          
          professional: process.env.AI_INSTRUCTION_PROFESSIONAL || `Gebruik een zakelijke, professionele toon. Focus op de business impact en relevantie. Noem de bronnen en voeg onderaan het artikel een lijst met bronnen op. Voeg extra bronnen toe als je die weet met de url eronder. Voeg de url toe aan de bronnen van de originele bron (het originele artikel).

WORDPRESS HTML FORMAT - Zakelijke stijl:
<h2>Executive Summary</h2>
<p>Korte samenvatting voor management...</p>

<h2>Business Impact</h2>
<ul>
<li><strong>Financiële gevolgen:</strong> Details</li>
<li><strong>Operationele risico's:</strong> Uitleg</li>
</ul>

<h2>Aanbevelingen</h2>
<p>Concrete actiepunten voor beslissers...</p>

<h2>Bronnen en Referenties</h2>
<ul>
<li><a href="[ORIGINELE_ARTIKEL_URL]" target="_blank">Origineel artikel</a></li>
<li><a href="https://example.com/extra-bron" target="_blank">Relevante extra bron (indien beschikbaar)</a></li>
</ul>`,
          
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
      const { categories, categoryKeywords, rewriteInstructions } = req.body
      
      console.log('Settings update requested:')
      console.log('Categories:', categories)
      console.log('Category Keywords:', categoryKeywords)
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