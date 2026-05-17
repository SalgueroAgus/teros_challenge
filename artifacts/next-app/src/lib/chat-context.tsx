'use client'

import { createContext, useContext, useState } from 'react'
import type { Message } from '@/types'

interface ChatContextValue {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  questionCount: number
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>
  sessionDocumentId: string | null
  setSessionDocumentId: React.Dispatch<React.SetStateAction<string | null>>
  sessionDocumentName: string | null
  setSessionDocumentName: React.Dispatch<React.SetStateAction<string | null>>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [sessionDocumentId, setSessionDocumentId] = useState<string | null>(null)
  const [sessionDocumentName, setSessionDocumentName] = useState<string | null>(null)

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        questionCount,
        setQuestionCount,
        sessionDocumentId,
        setSessionDocumentId,
        sessionDocumentName,
        setSessionDocumentName,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatSession(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatSession must be used within ChatProvider')
  return ctx
}
