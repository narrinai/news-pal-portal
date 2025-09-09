exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { password } = JSON.parse(event.body);
    const storedPassword = process.env.PORTAL_PASSWORD || 'newspal2024';
    
    console.log('Environment password exists:', !!storedPassword);
    console.log('Environment password length:', storedPassword?.length || 0);
    console.log('Input password length:', password?.length || 0);

    if (password === storedPassword) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'authenticated=true; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/',
        },
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Invalid password',
          debug: {
            hasEnvPassword: !!storedPassword,
            envPasswordLength: storedPassword?.length || 0,
            inputLength: password?.length || 0
          }
        })
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Login failed', details: error.message })
    };
  }
};