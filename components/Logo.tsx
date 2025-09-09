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
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12',
    xl: 'h-16'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl', 
    xl: 'text-4xl'
  }

  const IconSVG = () => (
    <div className={`${sizeClasses[size]} aspect-square relative`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Modern gradient definitions */}
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="url(#brandGradient)"
          className="drop-shadow-lg"
        />
        
        {/* Realistic Ostrich silhouet */}
        <g transform="translate(18, 10) scale(0.6)">
          {/* Hoofdlichaam - groter en meer ovaal */}
          <ellipse cx="50" cy="70" rx="22" ry="30" fill="white" className="opacity-95" />
          
          {/* Lange nek - veel langer en slanker voor struisvogel */}
          <ellipse cx="40" cy="35" rx="4" ry="25" fill="white" className="opacity-95" />
          
          {/* Klein hoofd */}
          <ellipse cx="38" cy="15" rx="6" ry="8" fill="white" className="opacity-95" />
          
          {/* Kleine snavel */}
          <ellipse cx="34" cy="13" rx="3" ry="1.5" fill="#374151" />
          
          {/* Oog */}
          <circle cx="40" cy="13" r="1.5" fill="#111827" />
          <circle cx="40.5" cy="12.5" r="0.5" fill="white" />
          
          {/* Lange poten - kenmerkend voor struisvogel */}
          <rect x="44" y="95" width="2.5" height="20" fill="#6b7280" />
          <rect x="52" y="95" width="2.5" height="20" fill="#6b7280" />
          
          {/* Voeten */}
          <ellipse cx="45" cy="117" rx="4" ry="2" fill="#374151" />
          <ellipse cx="53" cy="117" rx="4" ry="2" fill="#374151" />
          
          {/* Vleugel detail */}
          <path d="M32 60 Q45 55 58 65 Q60 70 55 75 Q45 80 35 75 Q30 68 32 60" 
                fill="white" 
                stroke="#6b7280" 
                strokeWidth="1" 
                className="opacity-80" />
          
          {/* Subtiele veren textuur */}
          <path d="M35 65 Q42 62 50 65 Q58 62 65 65" 
                stroke="#9ca3af" 
                strokeWidth="0.8" 
                fill="none" 
                className="opacity-40" />
          <path d="M35 75 Q42 72 50 75 Q58 72 65 75" 
                stroke="#9ca3af" 
                strokeWidth="0.8" 
                fill="none" 
                className="opacity-30" />
        </g>
        
        {/* Minimalistic news elements */}
        <g>
          {/* Simple news icon 1 */}
          <rect x="72" y="28" width="10" height="12" rx="2" fill="white" className="opacity-90" />
          <rect x="74" y="31" width="6" height="1" fill="#6b7280" className="opacity-60" />
          <rect x="74" y="33" width="4" height="1" fill="#6b7280" className="opacity-40" />
          <rect x="74" y="35" width="5" height="1" fill="#6b7280" className="opacity-40" />
          
          {/* Simple news icon 2 */}
          <rect x="15" y="48" width="8" height="10" rx="2" fill="white" className="opacity-80" />
          <rect x="17" y="51" width="4" height="1" fill="#6b7280" className="opacity-50" />
          <rect x="17" y="53" width="3" height="1" fill="#6b7280" className="opacity-30" />
          
          {/* Subtle accent dots */}
          <circle cx="78" cy="45" r="1.5" fill="white" className="opacity-60" />
          <circle cx="20" cy="65" r="1" fill="white" className="opacity-50" />
        </g>
      </svg>
    </div>
  )

  const BrandText = () => (
    <div className={`font-semibold ${textSizeClasses[size]} text-gray-900 tracking-tight`}>
      News Pal
    </div>
  )

  const LogoContent = () => {
    if (variant === 'icon') {
      return <IconSVG />
    }

    if (variant === 'text') {
      return <BrandText />
    }

    return (
      <div className="flex items-center space-x-3">
        <IconSVG />
        <BrandText />
      </div>
    )
  }

  if (clickable) {
    return (
      <a 
        href={href} 
        className={`${className} hover:opacity-80 transition-opacity duration-200 cursor-pointer`}
      >
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