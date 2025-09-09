export default async function handler(req, res) {
  try {
    // Test basic environment variables
    const airtableKey = process.env.AIRTABLE_TOKEN_NEWSPAL;
    const airtableBase = process.env.AIRTABLE_BASE_NEWSPAL;
    
    console.log('Testing Airtable connection...');
    console.log('API Key exists:', !!airtableKey);
    console.log('API Key length:', airtableKey?.length || 0);
    console.log('Base ID exists:', !!airtableBase);
    console.log('Base ID:', airtableBase);
    
    if (!airtableKey || !airtableBase) {
      return res.status(500).json({
        error: 'Missing Airtable credentials',
        hasApiKey: !!airtableKey,
        hasBaseId: !!airtableBase,
        apiKeyLength: airtableKey?.length || 0,
        baseId: airtableBase
      });
    }
    
    // Try to import and test Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: airtableKey }).base(airtableBase);
    
    // Try to list records (just get 1 to test connection)
    const records = await base('Table 1').select({
      maxRecords: 1
    }).all();
    
    return res.status(200).json({
      success: true,
      message: 'Airtable connection works!',
      recordCount: records.length,
      hasApiKey: true,
      hasBaseId: true,
      baseId: airtableBase
    });
    
  } catch (error) {
    console.error('Airtable test error:', error);
    return res.status(500).json({
      error: 'Airtable connection failed',
      details: error.message,
      stack: error.stack
    });
  }
}