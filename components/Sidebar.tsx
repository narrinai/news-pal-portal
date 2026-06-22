'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from './Logo'
import { Zap, LogOut, ChevronRight } from 'lucide-react'

const navGroups = [
  {
    label: 'AUTOMATIC',
    items: [
      { icon: Zap, label: 'Automations', href: '/dashboard/automations' },
    ],
  },
]

type AutomationLink = { id: string; name: string }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [automations, setAutomations] = useState<AutomationLink[]>([])
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/automations')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return
        setAutomations(
          data
            .filter((a: any) => a && a.id)
            .map((a: any) => ({ id: a.id as string, name: a.name || 'Untitled' }))
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/dashboard/automations') {
      return pathname.startsWith('/dashboard/automations') || pathname.startsWith('/dashboard/rewrite')
    }
    return pathname.startsWith(href)
  }

  const isAutomationActive = (id: string) => {
    if (!pathname) return false
    return pathname.startsWith(`/dashboard/automations/${id}`)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.push('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Logo size="lg" clickable href="/dashboard/automations" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 tracking-wider">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const isAutomations = item.href === '/dashboard/automations'
                const hasShortcuts = isAutomations && automations.length > 0
                return (
                  <div key={item.href}>
                    <div
                      className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
                      }`}
                    >
                      <Link href={item.href} className="flex items-center flex-1 px-3 py-2">
                        <Icon className={`w-4 h-4 mr-3 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {item.label}
                      </Link>
                      {hasShortcuts && (
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => !v)}
                          aria-label={expanded ? 'Collapse automations' : 'Expand automations'}
                          aria-expanded={expanded}
                          className="px-2 py-2 mr-1 text-slate-400 hover:text-slate-700"
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Automation shortcuts */}
                    {hasShortcuts && expanded && (
                      <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 space-y-0.5">
                        {automations.map((automation) => {
                          const subActive = isAutomationActive(automation.id)
                          return (
                            <Link
                              key={automation.id}
                              href={`/dashboard/automations/${automation.id}`}
                              title={automation.name}
                              className={`block px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
                                subActive
                                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {automation.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3 text-slate-400" />
          Log out
        </button>
      </div>
    </aside>
  )
}
