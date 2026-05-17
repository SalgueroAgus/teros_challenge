'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message, FileUploadState } from '@/types'
import { uploadDocument, queryDocuments, pollDocumentReady } from '@/lib/api'
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

  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>('idle')
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Tracks the document_id of the currently in-flight upload so stale callbacks
  // (from a removed attachment) don't update state after the fact.
  const activeUploadIdRef = useRef<string | null>(null)
  const pollAbortRef = useRef<AbortController | null>(null)

  const limitReached = questionCount >= QUESTION_LIMIT

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages, isLoading])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleRemoveAttachment() {
    // Abort any in-flight poll so it stops making requests
    pollAbortRef.current?.abort()
    pollAbortRef.current = null
    activeUploadIdRef.current = null
    setAttachedFile(null)
    setFileUploadState('idle')
    setUploadedDocumentId(null)
  }

  async function handleAttach(file: File) {
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

    // Cancel any previous in-flight upload
    pollAbortRef.current?.abort()
    const abortController = new AbortController()
    pollAbortRef.current = abortController

    setAttachedFile(file)
    setFileUploadState('uploading')
    setUploadedDocumentId(null)

    let docId: string
    try {
      const uploaded = await uploadDocument(file)
      docId = uploaded.document_id
    } catch (err) {
      if (!pollAbortRef.current || pollAbortRef.current === abortController) {
        setFileUploadState('error')
        showToast(`Upload failed: ${err instanceof Error ? err.message : 'Please try again.'}`)
        setTimeout(() => handleRemoveAttachment(), 3000)
      }
      return
    }

    // If the user removed the file while the HTTP request was in flight, bail out.
    if (abortController.signal.aborted) return

    activeUploadIdRef.current = docId
    setFileUploadState('processing')

    try {
      const result = await pollDocumentReady(docId, abortController.signal)

      // Guard: user may have removed the file while we were polling
      if (activeUploadIdRef.current !== docId) return

      if (result === 'done') {
        setFileUploadState('done')
        setUploadedDocumentId(docId)
      } else {
        setFileUploadState('error')
        showToast(`"${file.name}" could not be processed. Please try a different file.`)
        setTimeout(() => {
          if (activeUploadIdRef.current === docId) handleRemoveAttachment()
        }, 3000)
      }
    } catch (e) {
      // AbortError means the user removed the attachment — no UI update needed
      if ((e as Error).name !== 'AbortError') {
        setFileUploadState('error')
        showToast(`"${file.name}" could not be processed. Please try again.`)
        setTimeout(() => {
          if (activeUploadIdRef.current === docId) handleRemoveAttachment()
        }, 3000)
      }
    }
  }

  // Effective document context: session upload (done) > URL param > none (global search)
  const effectiveDocumentId = sessionDocumentId ?? activeDocumentId
  const effectiveDocumentName = sessionDocumentName ?? activeDocumentName ?? null

  async function handleSend(contentOverride?: string) {
    const content = (contentOverride ?? inputValue).trim()
    if (!content || isLoading || limitReached) return
    // Block send while attachment is still uploading / processing
    if (fileUploadState === 'uploading' || fileUploadState === 'processing') return

    let documentId = effectiveDocumentId

    // If a freshly-uploaded file is ready, use it and promote it to session context
    if (attachedFile && fileUploadState === 'done' && uploadedDocumentId) {
      documentId = uploadedDocumentId
      setSessionDocumentId(uploadedDocumentId)
      setSessionDocumentName(attachedFile.name)
      // Clear the chip — the context badge takes over from here
      handleRemoveAttachment()
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setQuestionCount((c) => c + 1)

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const { answer, sources } = await queryDocuments(content, documentId, history)
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex-shrink-0 pb-5 pt-3 px-0">
        {/* Turns remaining counter */}
        {!limitReached && (
          <div className="flex justify-center mb-2">
            <span className="text-xs text-[#94A3B8] tabular-nums">
              {QUESTION_LIMIT - questionCount} / {QUESTION_LIMIT} turns remaining
            </span>
          </div>
        )}
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
                onClick={() => {
                  setMessages([])
                  setQuestionCount(0)
                  setSessionDocumentId(null)
                  setSessionDocumentName(null)
                  handleRemoveAttachment()
                }}
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
            fileUploadState={fileUploadState}
            onAttach={handleAttach}
            onRemoveAttachment={handleRemoveAttachment}
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
