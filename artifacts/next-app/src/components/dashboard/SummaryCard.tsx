import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface SummaryCardProps {
  title: string
  value?: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  className?: string
}

export function SummaryCard({
  title,
  value = '—',
  subtitle = 'Upload documents to see insights',
  icon: Icon,
  iconColor = '#4F6CF7',
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#64748B]">{title}</span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon size={16} style={{ color: iconColor }} />
          </div>
        )}
      </div>
      <div>
        <span className="text-3xl font-semibold text-[#0F172A]">{value}</span>
      </div>
      <p className="text-xs text-[#64748B]">{subtitle}</p>
    </div>
  )
}
