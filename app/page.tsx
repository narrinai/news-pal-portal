import { redirect } from 'next/navigation'

export default function Home() {
  // In development, skip login and go straight to dashboard
  if (process.env.NODE_ENV === 'development') {
    redirect('/dashboard')
  }

  redirect('/login')
}