'use client'

interface SuggestionCardsProps {
  onSelect: (text: string) => void
}

const suggestions = [
  'How much did I spend last month?',
  'What are my largest expenses?',
  'Summarize my income sources',
]

export function SuggestionCards({ onSelect }: SuggestionCardsProps) {
  return (
    <div className="flex flex-col items-center gap-8 px-4">
      {/* Logo / Icon */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#4F6CF7] flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#0F172A]">
            What would you like to know?
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Ask me anything about your finances
          </p>
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="flex flex-col gap-2.5 w-full max-w-md">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="text-left px-4 py-3.5 rounded-xl bg-white shadow-sm border border-gray-100
                       text-sm text-[#0F172A] font-medium
                       hover:border-[#4F6CF7] hover:shadow-md
                       focus:outline-none focus:ring-2 focus:ring-[#4F6CF7] focus:ring-offset-2"
          >
            <span className="text-[#4F6CF7] mr-2">&#x2192;</span>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
