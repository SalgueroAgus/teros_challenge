'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/types'
import { uploadDocument, queryDocuments } from '@/lib/api'
import { useChatSession } from '@/lib/chat-context'
import { MessageBubble, LoadingBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { SuggestionCards } from './SuggestionCards'

interface ChatViewProps {
  activeDocumentId: string | null
  activeDocumentName?: string
}

const QUESTION_LIMIT = 25
const MAX_FILE_BYTES = 10 * 1024 * 1024

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ChatView({ activeDocumentId, activeDocumentName }: ChatViewProps) {
  // Persistent across tab navigation — lives in context above the route
  const {
    messages,
    setMessages,
    questionCount,
    setQuestionCount,
    sessionDocumentId,
    setSessionDocumentId,
    sessionDocumentName,
    setSessionDocumentName,
  } = useChatSession()

  // Transient — fine to lose on tab switch
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  const limitReached = questionCount >= QUESTION_LIMIT

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  function handleAttach(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: `"${file.name}" is too large. Files must be under 10 MB.`,
          timestamp: new Date(),
        },
      ])
      return
    }
    setAttachedFile(file)
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages, isLoading])

  // Effective document context: session upload > prop passed in > none (searches all)
  const effectiveDocumentId = sessionDocumentId ?? activeDocumentId
  const effectiveDocumentName = sessionDocumentName ?? activeDocumentName ?? null

  async function handleSend(contentOverride?: string) {
    const content = (contentOverride ?? inputValue).trim()
    if (!content || isLoading || limitReached) return

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
    setQuestionCount((c) => c + 1)

    try {
      let documentId = effectiveDocumentId

      if (fileToUpload) {
        const uploaded = await uploadDocument(fileToUpload)
        documentId = uploaded.document_id
        setSessionDocumentId(uploaded.document_id)
        setSessionDocumentName(fileToUpload.name)
      }

      const { answer, sources } = await queryDocuments(content, documentId)

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
          sources,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full bg-[#F0F4FF]">
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

      <div className="flex-shrink-0 pb-5 pt-3 px-0">
        {limitReached ? (
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 text-center space-y-3">
              <p className="text-sm text-[#0F172A] font-medium">
                You&apos;ve reached the {QUESTION_LIMIT}-question session limit.
              </p>
              <p className="text-xs text-[#64748B]">
                Start a new session to continue — your documents will remain available.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#4F6CF7] text-white text-sm font-medium rounded-lg hover:bg-[#3B5BDB] focus:outline-none focus:ring-2 focus:ring-[#4F6CF7] focus:ring-offset-1"
              >
                Start new session
              </button>
            </div>
          </div>
        ) : (
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            attachedFile={attachedFile}
            onAttach={handleAttach}
            onRemoveAttachment={() => setAttachedFile(null)}
            isLoading={isLoading}
            activeDocumentName={effectiveDocumentName}
            onClearActiveDocument={
              sessionDocumentId
                ? () => { setSessionDocumentId(null); setSessionDocumentName(null) }
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
