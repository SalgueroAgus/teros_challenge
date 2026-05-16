import { Suspense } from 'react'
import { ChatPageInner } from './ChatPageInner'

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}
