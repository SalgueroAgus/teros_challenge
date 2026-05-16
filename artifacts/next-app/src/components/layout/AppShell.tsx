'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
  activeDocumentId: string | null
}

export function AppShell({ children, activeDocumentId }: AppShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
        activeDocumentId={activeDocumentId}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
