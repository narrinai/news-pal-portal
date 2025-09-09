import bcrypt from 'bcryptjs'

export async function verifyPassword(password: string): Promise<boolean> {
  const storedPassword = process.env.PORTAL_PASSWORD || 'newspal2024'
  
  // For now we'll use simple comparison, but you can hash it later
  return password === storedPassword
}

export function isAuthenticated(cookies: any): boolean {
  return cookies.get('authenticated') === 'true'
}