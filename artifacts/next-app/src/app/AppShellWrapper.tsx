'use client'

import { AppShell } from '@/components/layout/AppShell'
import { ChatProvider } from '@/lib/chat-context'

export function AppShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <AppShell activeDocumentId={null}>
        {children}
      </AppShell>
    </ChatProvider>
  )
}
