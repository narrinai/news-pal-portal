exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: 'Netlify function works!',
      method: event.httpMethod,
      path: event.path,
      env: {
        hasPortalPassword: !!process.env.PORTAL_PASSWORD,
        hasAirtable: !!process.env.AIRTABLE_API_KEY,
        hasOpenAI: !!process.env.OPENAI_API_KEY
      }
    })
  };
};