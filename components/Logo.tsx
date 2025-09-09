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
        
        {/* Photo-realistic Ostrich head */}
        <g transform="translate(20, 15) scale(0.7)">
          {/* Hoofd vorm - meer rond zoals op foto */}
          <ellipse cx="45" cy="35" rx="20" ry="25" fill="white" className="opacity-95" />
          
          {/* Pluizige veren bovenop hoofd */}
          <g className="opacity-90">
            {/* Veren clusters */}
            <path d="M30 15 Q35 10 40 15 Q45 8 50 15 Q55 10 60 15" 
                  stroke="white" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeLinecap="round" />
            <path d="M32 20 Q37 12 42 20 Q47 10 52 20 Q57 12 62 20" 
                  stroke="#f3f4f6" 
                  strokeWidth="1.5" 
                  fill="none" 
                  strokeLinecap="round" />
          </g>
          
          {/* Grote expressieve ogen - kenmerkend van de foto */}
          <g>
            {/* Linker oog */}
            <ellipse cx="35" cy="30" rx="5" ry="6" fill="#1f2937" />
            <ellipse cx="37" cy="28" rx="2" ry="2.5" fill="white" />
            <circle cx="37.5" cy="29" r="0.8" fill="#1f2937" />
            
            {/* Rechter oog */}
            <ellipse cx="55" cy="30" rx="5" ry="6" fill="#1f2937" />
            <ellipse cx="53" cy="28" rx="2" ry="2.5" fill="white" />
            <circle cx="52.5" cy="29" r="0.8" fill="#1f2937" />
          </g>
          
          {/* Snavel - breed en plat zoals struisvogels */}
          <ellipse cx="45" cy="45" rx="8" ry="4" fill="#6b7280" />
          <ellipse cx="45" cy="43" rx="6" ry="2" fill="#9ca3af" />
          
          {/* Neusgaten */}
          <ellipse cx="42" cy="43" rx="1" ry="0.8" fill="#374151" />
          <ellipse cx="48" cy="43" rx="1" ry="0.8" fill="#374151" />
          
          {/* Nek - dik en krachtig */}
          <ellipse cx="45" cy="65" rx="12" ry="15" fill="white" className="opacity-90" />
          
          {/* Subtiele veren textuur op nek */}
          <g className="opacity-60">
            <path d="M35 55 Q40 52 45 55 Q50 52 55 55" 
                  stroke="#e5e7eb" 
                  strokeWidth="0.8" 
                  fill="none" />
            <path d="M35 62 Q40 59 45 62 Q50 59 55 62" 
                  stroke="#e5e7eb" 
                  strokeWidth="0.8" 
                  fill="none" />
            <path d="M35 69 Q40 66 45 69 Q50 66 55 69" 
                  stroke="#e5e7eb" 
                  strokeWidth="0.8" 
                  fill="none" />
          </g>
          
          {/* Lichaam hint */}
          <ellipse cx="45" cy="85" rx="15" ry="10" fill="white" className="opacity-70" />
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