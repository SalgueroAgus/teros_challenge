'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/types'
import { uploadDocument, queryDocuments } from '@/lib/api'
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

    const fileToUpload = attachedFile

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

    try {
      // Upload file first if one is attached
      let documentId = activeDocumentId
      if (fileToUpload) {
        const uploaded = await uploadDocument(fileToUpload)
        documentId = uploaded.document_id
      }

      // Query the RAG pipeline
      const { answer, sources } = await queryDocuments(content, documentId)

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
        sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <div className="flex items-center justify-center h-full min-h-0">
            <SuggestionCards onSelect={(text) => handleSend(text)} />
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

      {/* Input bar */}
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
