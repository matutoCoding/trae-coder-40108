import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Tag, CheckCircle2, Truck } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'

const STATUS_CONFIG = {
  pending: { label: '待确认', color: 'bg-accent-amber/20 text-accent-amber', icon: Tag },
  confirmed: { label: '已确认', color: 'bg-accent-blue/20 text-accent-blue', icon: CheckCircle2 },
  completed: { label: '已出库', color: 'bg-accent-green/20 text-accent-green', icon: Truck },
} as const

export default function OutboundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const confirmOutboundOrder = useWarehouseStore((s) => s.confirmOutboundOrder)

  const order = outboundOrders.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900 font-body">
        <p className="text-gray-500">出库单不存在</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[order.status]

  const handleConfirm = () => {
    if (order.status !== 'pending') return
    confirmOutboundOrder(order.id)
  }

  return (
    <div className="min-h-screen bg-dark-900 font-body">
      <div className="sticky top-0 z-10 bg-dark-800 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-white">出库单详情</h1>
        </div>
      </div>

      <div className="px-4 pb-32 pt-4">
        <div className="rounded-xl bg-dark-800 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm text-gray-400">{order.orderNo}</p>
              <p className="mt-1 text-base font-medium text-white">{order.skuName}</p>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
              <statusCfg.icon className="h-3 w-3" />
              {statusCfg.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">出库数量</p>
              <p className="mt-0.5 font-mono text-sm font-medium text-white">{order.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">货主</p>
              <p className="mt-0.5 text-sm font-medium text-white">{order.ownerName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">创建时间</p>
              <p className="mt-0.5 font-mono text-sm text-gray-300">{order.createdAt}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">确认时间</p>
              <p className="mt-0.5 font-mono text-sm text-gray-300">{order.confirmedAt ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400">批次明细</h2>
          <div className="space-y-2">
            {order.batches.map((item) => (
              <div
                key={item.batchId}
                className={`rounded-xl bg-dark-800 p-4 ${
                  item.isFifoRecommended ? 'border border-accent-blue/40' : 'border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm text-white">{item.batchNo}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      效期 <span className="font-mono">{item.expiryDate}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.isFifoRecommended && (
                      <span className="rounded-full bg-accent-blue/20 px-2 py-0.5 text-xs font-medium text-accent-blue">
                        FIFO推荐
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  出库数量 <span className="font-mono font-medium text-white">{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {order.status === 'pending' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <button
            onClick={handleConfirm}
            className="w-full rounded-xl bg-accent-blue py-3.5 text-base font-medium text-white transition-opacity active:opacity-80"
          >
            确认出库
          </button>
        </div>
      )}

      {order.status === 'confirmed' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-blue/20 py-3.5 text-base font-medium text-accent-blue">
            <CheckCircle2 className="h-5 w-5" />
            已完成
          </div>
        </div>
      )}

      {order.status === 'completed' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-green/20 py-3.5 text-base font-medium text-accent-green">
            <Truck className="h-5 w-5" />
            已出库
          </div>
        </div>
      )}
    </div>
  )
}
