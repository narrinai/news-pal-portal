export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Pages Router API works!',
    method: req.method,
    env: {
      hasPortalPassword: !!process.env.PORTAL_PASSWORD_NEWSPAL,
      hasAirtable: !!process.env.AIRTABLE_TOKEN_NEWSPAL,
      hasOpenAI: !!process.env.OPENAI_TOKEN_NEWSPAL,
      portalPasswordLength: process.env.PORTAL_PASSWORD_NEWSPAL?.length || 0
    }
  });
}