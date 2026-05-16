'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
  activeDocumentId: string | null
}

const navItems = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    href: '/overview',
  },
  {
    label: 'Chat',
    icon: MessageSquare,
    href: '/chat',
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    href: '/documents',
  },
]

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-100 overflow-hidden',
        'flex-shrink-0'
      )}
      style={{ width: expanded ? '220px' : '56px' }}
    >
      {/* Header / Toggle */}
      <div className="flex items-center h-14 px-3 border-b border-gray-100 flex-shrink-0">
        {expanded && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#4F6CF7] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="font-semibold text-[#0F172A] text-sm truncate">FinSight</span>
          </div>
        )}
        {!expanded && (
          <div className="w-7 h-7 rounded-lg bg-[#4F6CF7] flex items-center justify-center flex-shrink-0 mx-auto">
            <span className="text-white font-bold text-xs">F</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md',
            'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100',
            !expanded && 'hidden'
          )}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronLeft size={14} />
        </button>
        {!expanded && (
          <button
            onClick={onToggle}
            className="absolute left-0 w-14 h-14 flex items-center justify-center text-[#64748B] hover:text-[#0F172A]"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/overview')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium',
                'hover:bg-[#F0F4FF] hover:text-[#4F6CF7]',
                isActive
                  ? 'bg-[#EEF2FF] text-[#4F6CF7]'
                  : 'text-[#64748B]',
                !expanded && 'justify-center px-0'
              )}
              title={!expanded ? item.label : undefined}
            >
              <Icon
                size={18}
                className={cn('flex-shrink-0', isActive ? 'text-[#4F6CF7]' : 'text-[#64748B]')}
              />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings */}
      <div className="py-3 px-2 border-t border-gray-100 flex-shrink-0">
        <button
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium w-full',
            'text-[#64748B] hover:bg-[#F0F4FF] hover:text-[#4F6CF7]',
            !expanded && 'justify-center px-0'
          )}
          title={!expanded ? 'Settings' : undefined}
        >
          <Settings size={18} className="flex-shrink-0" />
          {expanded && <span>Settings</span>}
        </button>
      </div>
    </aside>
  )
}
