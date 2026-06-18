import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: 'up' | 'down'
  color?: 'blue' | 'amber' | 'green' | 'red'
  subtitle?: string
}

const colorMap = {
  blue: 'bg-accent-blue/15 text-accent-blue',
  amber: 'bg-accent-amber/15 text-accent-amber',
  green: 'bg-accent-green/15 text-accent-green',
  red: 'bg-accent-red/15 text-accent-red',
}

const trendColorMap = {
  up: 'text-accent-green',
  down: 'text-accent-red',
}

export default function StatCard({ title, value, icon, trend, color = 'blue', subtitle }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const rafRef = useRef<number>(0)
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0

  useEffect(() => {
    const duration = 800
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(numericValue * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [numericValue])

  const formattedValue = typeof value === 'number'
    ? Number.isInteger(numericValue) ? Math.round(displayValue) : displayValue.toFixed(2)
    : String(value)

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', colorMap[color])}>
          {icon}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-mono font-bold text-white">{formattedValue}</span>
        {trend && (
          <span className={cn('flex items-center text-xs font-medium mb-1', trendColorMap[trend])}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </span>
        )}
      </div>

      {subtitle && (
        <span className="text-[11px] text-gray-500 mt-1 block">{subtitle}</span>
      )}
    </div>
  )
}
