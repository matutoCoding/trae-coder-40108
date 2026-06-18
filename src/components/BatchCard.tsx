import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Batch } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { computeBatchStatus, computeDaysUntilExpiry } from '@/store/useWarehouseStore'

interface BatchCardProps {
  batch: Batch
}

const stripeColorMap = {
  normal: 'bg-accent-green',
  nearExpiry: 'bg-accent-amber',
  expired: 'bg-accent-red',
}

export default function BatchCard({ batch }: BatchCardProps) {
  const navigate = useNavigate()
  const status = computeBatchStatus(batch.expiryDate)
  const daysLeft = computeDaysUntilExpiry(batch.expiryDate)

  return (
    <div
      onClick={() => navigate(`/batch/${batch.id}`)}
      className="relative bg-dark-800 border border-dark-600 rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', stripeColorMap[status])} />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-white">{batch.batchNo}</p>
            <p className="text-xs text-gray-400 mt-0.5">{batch.skuName}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {batch.location}
          </span>
          <span className="font-mono text-gray-300">
            {batch.remainingQuantity}/{batch.quantity}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            {batch.expiryDate}
          </span>
          <span
            className={cn(
              'text-xs font-mono font-medium',
              daysLeft <= 0
                ? 'text-accent-red'
                : daysLeft <= 30
                  ? 'text-accent-amber'
                  : 'text-gray-400'
            )}
          >
            {daysLeft <= 0 ? `已过期${Math.abs(daysLeft)}天` : `剩余${daysLeft}天`}
          </span>
        </div>
      </div>
    </div>
  )
}
