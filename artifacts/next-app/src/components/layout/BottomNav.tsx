'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Overview',  icon: LayoutDashboard, href: '/overview'   },
  { label: 'Chat',      icon: MessageSquare,   href: '/chat'        },
  { label: 'Documents', icon: FolderOpen,      href: '/documents'   },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 flex">
      {navItems.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href || (pathname === '/' && href === '/overview')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2',
              isActive ? 'text-[#4F6CF7]' : 'text-[#94A3B8]'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
