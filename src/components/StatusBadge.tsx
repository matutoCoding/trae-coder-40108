import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'normal' | 'nearExpiry' | 'expired'
}

const statusConfig = {
  normal: {
    label: '正常',
    className: 'bg-accent-green/15 text-accent-green',
    pulse: false,
  },
  nearExpiry: {
    label: '临期',
    className: 'bg-accent-amber/15 text-accent-amber',
    pulse: true,
  },
  expired: {
    label: '过期锁定',
    className: 'bg-accent-red/15 text-accent-red',
    pulse: true,
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        config.className,
        config.pulse && 'animate-pulse-warning'
      )}
    >
      {config.pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {config.label}
    </span>
  )
}
