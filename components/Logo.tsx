interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
  className?: string
}

export default function Logo({ 
  size = 'md', 
  variant = 'full', 
  className = '' 
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
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#e879f9" />
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
        
        {/* Struisvogel silhouet */}
        <g transform="translate(15, 15) scale(0.7)">
          {/* Lichaam */}
          <ellipse cx="50" cy="65" rx="18" ry="25" fill="white" className="opacity-95" />
          
          {/* Nek */}
          <ellipse cx="45" cy="40" rx="6" ry="20" fill="white" className="opacity-95" />
          
          {/* Hoofd */}
          <ellipse cx="42" cy="22" rx="8" ry="10" fill="white" className="opacity-95" />
          
          {/* Snavel */}
          <ellipse cx="38" cy="20" rx="4" ry="2" fill="#fbbf24" />
          
          {/* Oog */}
          <circle cx="45" cy="20" r="2" fill="#0369a1" />
          <circle cx="45" cy="20" r="1" fill="white" />
          
          {/* Poten */}
          <rect x="42" y="85" width="3" height="15" fill="#fbbf24" />
          <rect x="52" y="85" width="3" height="15" fill="#fbbf24" />
          
          {/* Veren detail op lichaam */}
          <path d="M35 55 Q40 50 45 55 Q50 50 55 55 Q60 50 65 55" 
                stroke="#0369a1" 
                strokeWidth="1.5" 
                fill="none" 
                className="opacity-60" />
          <path d="M35 65 Q40 60 45 65 Q50 60 55 65 Q60 60 65 65" 
                stroke="#0369a1" 
                strokeWidth="1.5" 
                fill="none" 
                className="opacity-40" />
        </g>
        
        {/* Nieuwsartikelen rondom de struisvogel */}
        <g className="animate-pulse">
          {/* Mini nieuwsblaadje 1 */}
          <rect x="75" y="25" width="12" height="15" rx="1" fill="white" className="opacity-80" />
          <rect x="77" y="28" width="8" height="1" fill="#0369a1" className="opacity-60" />
          <rect x="77" y="31" width="6" height="1" fill="#0369a1" className="opacity-40" />
          <rect x="77" y="34" width="7" height="1" fill="#0369a1" className="opacity-40" />
          
          {/* Mini nieuwsblaadje 2 */}
          <rect x="12" y="45" width="10" height="12" rx="1" fill="white" className="opacity-70" />
          <rect x="14" y="48" width="6" height="1" fill="#0369a1" className="opacity-50" />
          <rect x="14" y="51" width="4" height="1" fill="#0369a1" className="opacity-30" />
          
          {/* AI sparkles */}
          <path d="M75 45 L77 47 L75 49 L73 47 Z" fill="#d946ef" className="animate-pulse" />
          <path d="M85 35 L86 36 L85 37 L84 36 Z" fill="#38bdf8" className="animate-pulse" />
          <path d="M20 65 L21 66 L20 67 L19 66 Z" fill="#fbbf24" className="animate-pulse" />
        </g>
      </svg>
    </div>
  )

  const BrandText = () => (
    <div className={`font-bold font-brand ${textSizeClasses[size]} bg-gradient-brand bg-clip-text text-transparent`}>
      News Pal
    </div>
  )

  if (variant === 'icon') {
    return <div className={className}><IconSVG /></div>
  }

  if (variant === 'text') {
    return <div className={className}><BrandText /></div>
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <IconSVG />
      <BrandText />
    </div>
  )
}