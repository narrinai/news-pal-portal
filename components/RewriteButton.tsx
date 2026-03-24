import { RefreshCw, PenLine } from 'lucide-react'

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
        className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
      >
        {isRewriting ? (
          <div className="flex items-center justify-center">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            AI rewriting...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <PenLine className="w-4 h-4 mr-2" />
            Rewrite Article
          </div>
        )}
      </button>

      {isRewriting && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="animate-pulse">
                <div className="w-5 h-5 bg-indigo-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-indigo-800">
                AI is working...
              </p>
              <p className="text-sm text-indigo-600">
                Rewriting the article. This may take 10–30 seconds.
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="bg-indigo-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full progress-bar"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
