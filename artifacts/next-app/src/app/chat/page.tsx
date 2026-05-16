'use client'

import { ChatView } from '@/components/chat/ChatView'

export default function ChatPage() {
  return (
    <div className="h-full">
      <ChatView activeDocumentId={null} />
    </div>
  )
}
