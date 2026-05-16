import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { AppShellWrapper } from './AppShellWrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    <html lang="en" className={inter.variable}>
      <body className="bg-[#F0F4FF] font-[var(--font-inter),system-ui,sans-serif]">
        <Providers>
          <AppShellWrapper>{children}</AppShellWrapper>
        </Providers>
      </body>
    </html>
  )
}
