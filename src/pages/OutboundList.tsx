import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, X } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { OutboundOrder } from '@/types'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'picking', label: '待拣货' },
  { key: 'picked', label: '已拣货' },
  { key: 'shipped', label: '已出库' },
] as const

type TabKey = (typeof TABS)[number]['key']

const STATUS_CONFIG: Record<OutboundOrder['status'], { label: string; color: string }> = {
  picking: { label: '待拣货', color: 'bg-accent-blue/20 text-accent-blue' },
  picked: { label: '已拣货', color: 'bg-accent-amber/20 text-accent-amber' },
  shipped: { label: '已出库', color: 'bg-accent-green/20 text-accent-green' },
}

export default function OutboundList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const batches = useWarehouseStore((s) => s.batches)
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const filterOwnerId = searchParams.get('ownerId')
  const filterPeriod = searchParams.get('period')

  const ownerName = filterOwnerId
    ? (batches.find(b => b.ownerId === filterOwnerId)?.ownerName
      ?? outboundOrders.find(o => o.ownerId === filterOwnerId)?.ownerName
      ?? '')
    : ''

  let filtered: OutboundOrder[] = activeTab === 'all'
    ? outboundOrders
    : outboundOrders.filter((o) => o.status === activeTab)
  if (filterOwnerId) filtered = filtered.filter(o => o.ownerId === filterOwnerId)
  if (filterPeriod) filtered = filtered.filter(o => (o.shippedAt ?? o.createdAt).startsWith(filterPeriod))

  const handlePick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = useWarehouseStore.getState().pickOutboundOrder(id)
    if (ok) {
      alert('✓ 拣货成功')
    } else {
      alert('✗ 拣货失败')
    }
  }

  const handleShip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = useWarehouseStore.getState().shipOutboundOrder(id)
    if (ok) {
      alert('✓ 出库成功')
    } else {
      alert('✗ 出库失败')
    }
  }

  const renderCTA = (order: OutboundOrder) => {
    switch (order.status) {
      case 'picking':
        return (
          <button
            onClick={(e) => handlePick(order.id, e)}
            className="w-full rounded-lg bg-accent-blue py-2 text-sm font-medium text-white transition-opacity active:opacity-80"
          >
            开始拣货
          </button>
        )
      case 'picked':
        return (
          <button
            onClick={(e) => handleShip(order.id, e)}
            className="w-full rounded-lg bg-accent-green py-2 text-sm font-medium text-white transition-opacity active:opacity-80"
          >
            确认出库
          </button>
        )
      case 'shipped':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/outbound/${order.id}`)
            }}
            className="w-full rounded-lg bg-dark-700 py-2 text-sm font-medium text-gray-300 transition-colors active:bg-dark-600"
          >
            查看详情
          </button>
        )
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 font-body">
      <div className="sticky top-0 z-10 bg-dark-800 px-4 pb-0 pt-12">
        <h1 className="font-display text-xl font-bold text-white">效期出库</h1>
        {filterOwnerId && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-blue/10 border border-accent-blue/30 px-4 py-3">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-400">筛选：</span>
              <span className="font-medium text-accent-blue">货主：{ownerName}</span>
              {filterPeriod && (
                <span className="font-medium text-accent-amber">账期：{filterPeriod}</span>
              )}
            </div>
            <button
              onClick={() => navigate('/outbound')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-700 text-gray-300 text-xs font-medium hover:bg-dark-600 transition-colors"
            >
              <X size={14} />
              <span>清除筛选</span>
            </button>
          </div>
        )}
        <div className={`flex gap-1 rounded-xl bg-dark-700 p-1 ${filterOwnerId ? 'mt-3' : 'mt-4'}`}>
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
                  <div className="mt-3">
                    {renderCTA(order)}
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
