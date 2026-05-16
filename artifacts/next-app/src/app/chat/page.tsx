'use client'

import { useSearchParams } from 'next/navigation'
import { ChatView } from '@/components/chat/ChatView'

export default function ChatPage() {
  const params = useSearchParams()
  const docId = params.get('docId')
  const docName = params.get('docName') ?? undefined

  return (
    <div className="h-full">
      <ChatView activeDocumentId={docId} activeDocumentName={docName} />
    </div>
  )
}
