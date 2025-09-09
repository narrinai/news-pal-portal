interface RewriteButtonProps {
  isRewriting: boolean
  onClick: () => void
  disabled?: boolean
}

export default function RewriteButton({ isRewriting, onClick, disabled }: RewriteButtonProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onClick}
        disabled={disabled || isRewriting}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-md font-medium disabled:opacity-50 relative transition-all duration-200"
      >
        {isRewriting ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            🤖 AI aan het herschrijven...
          </div>
        ) : (
          '✨ Herschrijf Artikel'
        )}
      </button>
      
      {/* Loading indicator */}
      {isRewriting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="animate-pulse">
                <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-blue-800">
                🤖 OpenAI GPT-4 aan het werk...
              </p>
              <p className="text-sm text-blue-600">
                Het artikel wordt herschreven volgens jouw WordPress instructies. Dit kan 10-30 seconden duren.
              </p>
            </div>
          </div>
          
          {/* Animated progress bar */}
          <div className="mt-3">
            <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full progress-bar"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}