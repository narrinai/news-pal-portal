export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Pages Router API works!',
    method: req.method,
    env: {
      hasPortalPassword: !!process.env.PORTAL_PASSWORD,
      hasAirtable: !!process.env.AIRTABLE_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      portalPasswordLength: process.env.PORTAL_PASSWORD?.length || 0
    }
  });
}