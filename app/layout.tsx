import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NotificationProvider } from '../components/NotificationSystem'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'News Pal Portal',
  description: 'Nieuws management en content beheer portal',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  )
}