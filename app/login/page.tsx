'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import Logo from '../../components/Logo'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        // Cookie wordt gezet door server response
        router.push('/dashboard')
      } else {
        const result = await response.json()
        setError(result.error || 'Incorrect password')
        
        // Debug info tonen
        if (result.debug) {
          console.log('Debug info:', result.debug)
        }
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <Logo size="xl" />
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">
            Je slimme assistent voor nieuws management
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Voer je wachtwoord in om toegang te krijgen
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-all duration-200 bg-white/80 backdrop-blur-sm"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-brand hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all duration-200 transform"
            >
              {loading ? 'Inloggen...' : 'Inloggen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}