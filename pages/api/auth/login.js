export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    const storedPassword = process.env.PORTAL_PASSWORD || 'newspal2024';
    
    console.log('Environment password exists:', !!storedPassword);
    console.log('Environment password length:', storedPassword?.length || 0);
    console.log('Input password length:', password?.length || 0);

    if (password === storedPassword) {
      // Set HTTP-only cookie
      res.setHeader('Set-Cookie', 'authenticated=true; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/');
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ 
        error: 'Invalid password',
        debug: {
          hasEnvPassword: !!storedPassword,
          envPasswordLength: storedPassword?.length || 0,
          inputLength: password?.length || 0
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
}