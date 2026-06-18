import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Tag, Package, Truck, Clock } from 'lucide-react'
import { useWarehouseStore, splitFee } from '@/store/useWarehouseStore'
import type { OutboundOrder } from '@/types'

const STATUS_CONFIG: Record<OutboundOrder['status'], { label: string; color: string; icon: typeof Tag }> = {
  picking: { label: '待拣货', color: 'bg-accent-blue/20 text-accent-blue', icon: Tag },
  picked: { label: '已拣货', color: 'bg-accent-amber/20 text-accent-amber', icon: Package },
  shipped: { label: '已出库', color: 'bg-accent-green/20 text-accent-green', icon: Truck },
}

export default function OutboundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const commissionRecords = useWarehouseStore((s) => s.commissionRecords)
  const commissionRules = useWarehouseStore((s) => s.commissionRules)

  const order = outboundOrders.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900 font-body">
        <p className="text-gray-500">出库单不存在</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[order.status]

  const handlePick = () => {
    if (order.status !== 'picking') return
    const ok = useWarehouseStore.getState().pickOutboundOrder(order.id)
    if (ok) {
      alert('✓ 拣货成功')
    } else {
      alert('✗ 拣货失败')
    }
  }

  const handleShip = () => {
    if (order.status !== 'picked') return
    const ok = useWarehouseStore.getState().shipOutboundOrder(order.id)
    if (ok) {
      alert('✓ 出库成功')
    } else {
      alert('✗ 出库失败')
    }
  }

  const operationFee = order.operationFee ?? order.quantity * 5

  const getCommissionSplit = () => {
    const record = commissionRecords.find((r) => r.outboundOrderId === order.id)
    if (record) {
      return {
        totalFee: record.totalFee,
        platformShare: record.platformShare,
        warehouseShare: record.warehouseShare,
        ownerShare: record.ownerShare,
      }
    }
    const rule = commissionRules.find((r) => r.ownerId === order.ownerId)
    const pRate = rule?.platformRate ?? 0.1
    const wRate = rule?.warehouseRate ?? 0.6
    const split = splitFee(operationFee, pRate, wRate)
    return {
      totalFee: operationFee,
      platformShare: split.platformShare,
      warehouseShare: split.warehouseShare,
      ownerShare: split.ownerShare,
    }
  }

  const split = order.status === 'shipped' ? getCommissionSplit() : null

  const timelineSteps = [
    {
      key: 'created',
      label: '创建出库单',
      time: order.createdAt,
      done: true,
      icon: Clock,
      color: 'text-accent-blue',
      dot: 'bg-accent-blue',
    },
    {
      key: 'picked',
      label: '拣货完成',
      time: order.pickedAt,
      done: !!order.pickedAt,
      icon: Package,
      color: order.pickedAt ? 'text-accent-amber' : 'text-gray-500',
      dot: order.pickedAt ? 'bg-accent-amber' : 'bg-gray-600',
    },
    {
      key: 'shipped',
      label: '出库完成',
      time: order.shippedAt,
      done: !!order.shippedAt,
      icon: Truck,
      color: order.shippedAt ? 'text-accent-green' : 'text-gray-500',
      dot: order.shippedAt ? 'bg-accent-green' : 'bg-gray-600',
    },
  ]

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
              <p className="text-xs text-gray-500">拣货时间</p>
              <p className="mt-0.5 font-mono text-sm text-gray-300">{order.pickedAt ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-dark-800 p-4">
          <h2 className="mb-4 text-sm font-medium text-gray-400">处理进度</h2>
          <div className="relative">
            {timelineSteps.map((step, idx) => {
              const isLast = idx === timelineSteps.length - 1
              return (
                <div key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && (
                    <div
                      className={`absolute left-[11px] top-6 w-px h-full ${
                        step.done ? 'bg-dark-600' : 'bg-dark-700'
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.dot}`}
                  >
                    <step.icon className={`h-3 w-3 ${step.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${step.done ? 'text-white' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-gray-500">{step.time ?? '-'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {order.status === 'shipped' && split && (
          <div className="mt-6 rounded-xl bg-dark-800 p-4">
            <h2 className="mb-4 text-sm font-medium text-gray-400">费用与分账</h2>
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <span className="text-sm text-gray-300">操作费</span>
              <span className="font-mono text-base font-bold text-white">
                ¥{split.totalFee.toFixed(2)}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">平台分成</span>
                <span className="font-mono text-accent-blue">¥{split.platformShare.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">仓库分成</span>
                <span className="font-mono text-accent-amber">¥{split.warehouseShare.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">货主应付</span>
                <span className="font-mono text-accent-green">¥{split.ownerShare.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

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

      {order.status === 'picking' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <button
            onClick={handlePick}
            className="w-full rounded-xl bg-accent-blue py-3.5 text-base font-medium text-white transition-opacity active:opacity-80"
          >
            开始拣货
          </button>
        </div>
      )}

      {order.status === 'picked' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <button
            onClick={handleShip}
            className="w-full rounded-xl bg-accent-green py-3.5 text-base font-medium text-white transition-opacity active:opacity-80"
          >
            确认出库
          </button>
        </div>
      )}

      {order.status === 'shipped' && (
        <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-green/20 py-3.5 text-base font-medium text-accent-green">
            <Truck className="h-5 w-5" />
            ✓ 已完成出库
          </div>
        </div>
      )}
    </div>
  )
}
