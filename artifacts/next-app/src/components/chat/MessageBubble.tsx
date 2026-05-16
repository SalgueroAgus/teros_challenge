import type { Message } from '@/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#4F6CF7] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
          <span className="text-white font-bold text-xs">F</span>
        </div>
      )}
      <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start', 'max-w-[75%]')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed w-full',
            isUser
              ? 'bg-[#4F6CF7] text-white rounded-br-sm'
              : 'bg-white text-[#0F172A] shadow-sm rounded-bl-sm'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span
            className={cn(
              'text-xs mt-1.5 block',
              isUser ? 'text-blue-200 text-right' : 'text-[#94A3B8]'
            )}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full space-y-1">
            <p className="text-xs text-[#94A3B8] px-1">Sources</p>
            {message.sources.map((source) => (
              <div
                key={source.chunk_id}
                className="bg-white/70 border border-gray-100 rounded-xl px-3 py-2 text-xs text-[#64748B] leading-relaxed"
              >
                <span className="text-[#4F6CF7] font-medium mr-2">
                  {(source.similarity * 100).toFixed(0)}% match
                </span>
                {source.content.slice(0, 160).trim()}
                {source.content.length > 160 ? '…' : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function LoadingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div className="w-7 h-7 rounded-full bg-[#4F6CF7] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
        <span className="text-white font-bold text-xs">F</span>
      </div>
      <div className="bg-white text-[#0F172A] shadow-sm rounded-2xl rounded-bl-sm px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] inline-block dot-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] inline-block dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] inline-block dot-3" />
        </div>
      </div>
    </div>
  )
}
