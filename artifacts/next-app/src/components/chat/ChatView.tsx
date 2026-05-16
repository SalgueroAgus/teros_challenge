'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/types'
import { MessageBubble, LoadingBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { SuggestionCards } from './SuggestionCards'

interface ChatViewProps {
  activeDocumentId: string | null
  activeDocumentName?: string
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ChatView({ activeDocumentId, activeDocumentName }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages, isLoading])

  async function handleSend(contentOverride?: string) {
    const content = (contentOverride ?? inputValue).trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setAttachedFile(null)
    setIsLoading(true)

    // Log the request (API not wired yet)
    console.log('[FinSight] Sending query:', {
      content,
      activeDocumentId,
      attachedFile: attachedFile?.name ?? null,
    })

    // Mock response
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const mockResponses = [
        "I'm analyzing your financial data. Once you upload your documents, I can provide detailed insights about your spending patterns and financial health.",
        "That's a great question! Upload your bank statements or financial documents and I'll break down the numbers for you.",
        "I can help with that. To get accurate figures, please upload your financial documents through the paperclip icon below.",
      ]

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: mockResponses[Math.floor(Math.random() * mockResponses.length)],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full bg-[#F0F4FF]">
      {/* Message area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {!hasMessages ? (
          <div className="flex items-center justify-center h-full min-h-0">
            <SuggestionCards
              onSelect={(text) => handleSend(text)}
            />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar — fixed at bottom */}
      <div className="flex-shrink-0 pb-5 pt-3 px-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          attachedFile={attachedFile}
          onAttach={setAttachedFile}
          onRemoveAttachment={() => setAttachedFile(null)}
          isLoading={isLoading}
          activeDocumentName={activeDocumentName}
        />
      </div>
    </div>
  )
}
