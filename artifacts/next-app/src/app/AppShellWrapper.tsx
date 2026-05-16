'use client'

import { AppShell } from '@/components/layout/AppShell'

export function AppShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppShell activeDocumentId={null}>
      {children}
    </AppShell>
  )
}
