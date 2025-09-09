import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '../../../auth/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Debug log (remove later)
    const envPassword = process.env.PORTAL_PASSWORD
    console.log('Environment password exists:', !!envPassword)
    console.log('Environment password length:', envPassword?.length || 0)
    console.log('Input password length:', password?.length || 0)

    const isValid = await verifyPassword(password)

    if (isValid) {
      const response = NextResponse.json({ success: true })
      response.cookies.set('authenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400 // 1 day
      })
      return response
    } else {
      return NextResponse.json({ 
        error: 'Invalid password',
        debug: {
          hasEnvPassword: !!envPassword,
          envPasswordLength: envPassword?.length || 0,
          inputLength: password?.length || 0
        }
      }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}