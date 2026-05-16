import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { AppShellWrapper } from './AppShellWrapper'

export const metadata: Metadata = {
  title: 'FinSight — AI Finance Assistant',
  description: 'AI-powered personal finance insights',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F0F4FF]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Providers>
          <AppShellWrapper>{children}</AppShellWrapper>
        </Providers>
      </body>
    </html>
  )
}
