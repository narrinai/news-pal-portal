'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  // Restore the user's preference (persisted across sessions).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === '1')
    } catch {}
  }, [])

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      } catch {}
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main
        className={`${collapsed ? 'ml-16' : 'ml-64'} min-h-screen transition-[margin] duration-200`}
      >
        {children}
      </main>
    </div>
  )
}
