import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { OutboundOrder } from '@/types'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
] as const

type TabKey = (typeof TABS)[number]['key']

const STATUS_CONFIG: Record<OutboundOrder['status'], { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-accent-amber/20 text-accent-amber' },
  confirmed: { label: '已确认', color: 'bg-accent-blue/20 text-accent-blue' },
  completed: { label: '已完成', color: 'bg-accent-green/20 text-accent-green' },
}

export default function OutboundList() {
  const navigate = useNavigate()
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const filtered = activeTab === 'all'
    ? outboundOrders
    : outboundOrders.filter((o) => o.status === activeTab)

  return (
    <div className="min-h-screen bg-dark-900 font-body">
      <div className="sticky top-0 z-10 bg-dark-800 px-4 pb-0 pt-12">
        <h1 className="font-display text-xl font-bold text-white">效期出库</h1>
        <div className="mt-4 flex gap-1 rounded-xl bg-dark-700 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-dark-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-24 pt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="mb-3 h-12 w-12 opacity-40" />
            <p className="text-sm">暂无出库单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status]
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/outbound/${order.id}`)}
                  className="cursor-pointer rounded-xl bg-dark-800 p-4 transition-colors active:bg-dark-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-gray-400">{order.orderNo}</p>
                      <p className="mt-1 truncate text-base font-medium text-white">{order.skuName}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      出库数量 <span className="font-mono font-medium text-white">{order.quantity}</span>
                    </span>
                    <span className="font-mono text-xs text-gray-500">{order.createdAt}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/outbound/create')}
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue shadow-lg shadow-accent-blue/30 transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  )
}
