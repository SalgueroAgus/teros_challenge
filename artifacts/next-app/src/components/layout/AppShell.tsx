'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
  activeDocumentId: string | null
}

export function AppShell({ children, activeDocumentId }: AppShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((v) => !v)}
          activeDocumentId={activeDocumentId}
        />
      </div>

      {/* Main content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1 overflow-hidden pb-14 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
