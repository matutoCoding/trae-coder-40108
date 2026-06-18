import { useState, useMemo } from 'react'
import { FileText, Calendar, ChevronDown, ChevronUp, Warehouse, Truck, CheckCircle2, CircleDot, Clock } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { SettlementBill } from '@/types'

const statusConfig: Record<SettlementBill['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: '待确认', color: 'text-accent-amber', bg: 'bg-accent-amber/15', icon: <Clock size={12} /> },
  confirmed: { label: '已确认', color: 'text-accent-blue', bg: 'bg-accent-blue/15', icon: <CircleDot size={12} /> },
  settled: { label: '已结算', color: 'text-accent-green', bg: 'bg-accent-green/15', icon: <CheckCircle2 size={12} /> },
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface GroupedSummary {
  rentTotal: number
  rentPlatform: number
  rentWarehouse: number
  rentOwner: number
  feeTotal: number
  feePlatform: number
  feeWarehouse: number
  feeOwner: number
}

function computeGroupedSummary(details: SettlementBill['details']): GroupedSummary {
  const rents = details.filter((d) => d.type === 'daily_rent')
  const fees = details.filter((d) => d.type === 'outbound_fee')
  return {
    rentTotal: rents.reduce((s, d) => s + d.amount, 0),
    rentPlatform: rents.reduce((s, d) => s + d.platformShare, 0),
    rentWarehouse: rents.reduce((s, d) => s + d.warehouseShare, 0),
    rentOwner: rents.reduce((s, d) => s + d.ownerShare, 0),
    feeTotal: fees.reduce((s, d) => s + d.amount, 0),
    feePlatform: fees.reduce((s, d) => s + d.platformShare, 0),
    feeWarehouse: fees.reduce((s, d) => s + d.warehouseShare, 0),
    feeOwner: fees.reduce((s, d) => s + d.ownerShare, 0),
  }
}

export default function Settlement() {
  const [period, setPeriod] = useState(getCurrentMonth)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const settlementBills = useWarehouseStore((s) => s.settlementBills)
  const generateSettlement = useWarehouseStore((s) => s.generateSettlement)
  const confirmSettlement = useWarehouseStore((s) => s.confirmSettlement)
  const settleSettlement = useWarehouseStore((s) => s.settleSettlement)

  const filteredBills = useMemo(
    () => settlementBills.filter((b) => b.period === period),
    [settlementBills, period]
  )

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-dark-900 font-body pb-6">
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-600">
        <h1 className="font-display text-lg font-semibold text-white px-4 pt-4 pb-3">对账结算</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 rounded-xl px-3 py-2.5 border border-dark-600">
            <Calendar size={16} className="text-accent-blue flex-shrink-0" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-white text-sm font-mono outline-none flex-1 [color-scheme:dark]"
            />
          </div>
          <button
            onClick={() => generateSettlement(period)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-accent-blue text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent-blue/90 active:scale-95 transition-all"
          >
            <FileText size={16} />
            生成对账单
          </button>
        </div>

        <div className="space-y-3">
          {filteredBills.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-12">暂无对账单数据</div>
          )}
          {filteredBills.map((bill) => {
            const isExpanded = expandedId === bill.id
            const status = statusConfig[bill.status]
            const summary = computeGroupedSummary(bill.details)

            return (
              <div key={bill.id} className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
                <div
                  className="px-4 py-3 flex items-center cursor-pointer active:bg-dark-700/50 transition-colors"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium truncate">{bill.ownerName}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <span className="font-mono text-xl font-semibold text-white">¥{bill.totalStorageFee.toFixed(2)}</span>
                  </div>
                  <div className="ml-2 text-gray-500">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 animate-slide-up">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-dark-700 rounded-lg px-2 py-2 text-center">
                        <div className="text-[10px] text-accent-blue mb-0.5">平台收入</div>
                        <div className="font-mono text-xs text-white">¥{bill.platformIncome.toFixed(2)}</div>
                      </div>
                      <div className="bg-dark-700 rounded-lg px-2 py-2 text-center">
                        <div className="text-[10px] text-accent-green mb-0.5">仓库收入</div>
                        <div className="font-mono text-xs text-white">¥{bill.warehouseIncome.toFixed(2)}</div>
                      </div>
                      <div className="bg-dark-700 rounded-lg px-2 py-2 text-center">
                        <div className="text-[10px] text-accent-amber mb-0.5">货主应付</div>
                        <div className="font-mono text-xs text-white">¥{bill.ownerPayable.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                        <Warehouse size={12} className="text-accent-blue" />
                        仓租汇总
                      </h4>
                      <div className="bg-dark-700/60 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">仓租合计</span>
                          <span className="font-mono text-sm text-white font-semibold">¥{summary.rentTotal.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-blue">平台</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.rentPlatform.toFixed(2)}</div>
                          </div>
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-green">仓库</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.rentWarehouse.toFixed(2)}</div>
                          </div>
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-amber">货主</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.rentOwner.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                        <Truck size={12} className="text-accent-green" />
                        出库操作费汇总
                      </h4>
                      <div className="bg-dark-700/60 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">操作费合计</span>
                          <span className="font-mono text-sm text-white font-semibold">¥{summary.feeTotal.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-blue">平台</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.feePlatform.toFixed(2)}</div>
                          </div>
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-green">仓库</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.feeWarehouse.toFixed(2)}</div>
                          </div>
                          <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-[10px] text-accent-amber">货主</div>
                            <div className="font-mono text-[11px] text-white">¥{summary.feeOwner.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-xs text-gray-400 font-medium mb-2">费用明细</h4>
                      <div className="space-y-1.5">
                        {bill.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-dark-700/40 rounded-lg px-3 py-2">
                            {detail.type === 'daily_rent' ? (
                              <Warehouse size={12} className="text-accent-blue flex-shrink-0" />
                            ) : (
                              <Truck size={12} className="text-accent-green flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-300 truncate">{detail.description}</div>
                              <div className="text-[10px] text-gray-500">{detail.date}</div>
                            </div>
                            <span className="font-mono text-xs text-white flex-shrink-0">¥{detail.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {bill.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); confirmSettlement(bill.id) }}
                          className="flex items-center gap-1.5 bg-accent-amber/20 text-accent-amber text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent-amber/30 active:scale-95 transition-all"
                        >
                          <Clock size={14} />
                          确认
                        </button>
                      )}
                      {bill.status === 'confirmed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); settleSettlement(bill.id) }}
                          className="flex items-center gap-1.5 bg-accent-blue/20 text-accent-blue text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent-blue/30 active:scale-95 transition-all"
                        >
                          <CheckCircle2 size={14} />
                          结算
                        </button>
                      )}
                      {bill.status === 'settled' && (
                        <span className="inline-flex items-center gap-1 text-sm text-accent-green/60 px-4 py-2">
                          <CheckCircle2 size={14} />
                          已结算
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
