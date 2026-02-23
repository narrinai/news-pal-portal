import { Newspaper } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
  className?: string
  clickable?: boolean
  href?: string
}

export default function Logo({
  size = 'md',
  variant = 'full',
  className = '',
  clickable = false,
  href = '/dashboard'
}: LogoProps) {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  const IconElement = () => (
    <div className="flex items-center justify-center rounded-lg bg-indigo-600 p-1.5">
      <Newspaper className={`${iconSizes[size]} text-white`} strokeWidth={1.5} />
    </div>
  )

  const BrandText = () => (
    <span className={`font-semibold ${textSizes[size]} text-slate-900 tracking-tight`}>
      News Pal
    </span>
  )

  const LogoContent = () => {
    if (variant === 'icon') return <IconElement />
    if (variant === 'text') return <BrandText />
    return (
      <div className="flex items-center space-x-2.5">
        <IconElement />
        <BrandText />
      </div>
    )
  }

  if (clickable) {
    return (
      <a href={href} className={`${className} hover:opacity-80 transition-opacity cursor-pointer`}>
        <LogoContent />
      </a>
    )
  }

  return (
    <div className={className}>
      <LogoContent />
    </div>
  )
}
