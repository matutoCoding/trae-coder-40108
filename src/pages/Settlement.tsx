import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText, Calendar, ChevronDown, ChevronUp, Warehouse, Truck, CheckCircle2, CircleDot, Clock, Lock, GitCompare, Download, Plus, Minus, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { SettlementBill, SettlementDiff } from '@/types'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'settled', label: '已结算' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface StatusStyle {
  badge: {
    label: string
    color: string
    bg: string
    icon: React.ReactNode
  }
  stripeColor: string
  borderColor: string
  hintText: string
}

const statusConfig: Record<SettlementBill['status'], StatusStyle> = {
  pending: {
    badge: {
      label: '待确认',
      color: 'text-accent-blue',
      bg: 'bg-accent-blue/15 border border-accent-blue/25',
      icon: <Clock size={12} />,
    },
    stripeColor: 'bg-accent-blue',
    borderColor: 'border-dark-600',
    hintText: '数据跟随实时变化',
  },
  confirmed: {
    badge: {
      label: '已确认 · 快照',
      color: 'text-accent-amber',
      bg: 'bg-accent-amber/15 border border-accent-amber/30',
      icon: <AlertTriangle size={12} />,
    },
    stripeColor: 'bg-accent-amber',
    borderColor: 'border-accent-amber/50',
    hintText: '金额已冻结，新数据见复核差异',
  },
  settled: {
    badge: {
      label: '🔒 已结算 · 锁定',
      color: 'text-gray-400',
      bg: 'bg-gray-500/15 border border-gray-500/25',
      icon: null,
    },
    stripeColor: 'bg-gray-500',
    borderColor: 'border-dark-500',
    hintText: '不可修改，归档保留',
  },
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

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}

function downloadCSV(filename: string, csvContent: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function DiffAmount({ value, label }: { value: number; label: string }) {
  const isZero = value === 0
  const isPositive = value > 0
  const textColor = isZero ? 'text-accent-green' : isPositive ? 'text-accent-red' : 'text-accent-green'
  const sign = value > 0 ? '+' : ''
  return (
    <div className="bg-dark-600/50 rounded-lg px-2 py-1.5 text-center">
      <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
      <div className={`font-mono text-[11px] font-semibold ${textColor}`}>
        {isZero ? '—' : `${sign}¥${value.toFixed(2)}`}
      </div>
    </div>
  )
}

export default function Settlement() {
  const location = useLocation()
  const locState = location.state as { ownerId?: string; period?: string } | null
  const [period, setPeriod] = useState<string>(() => locState?.period ?? getCurrentMonth())
  const [filterOwnerId, setFilterOwnerId] = useState<string | null>(() => locState?.ownerId ?? null)
  const [filterStatus, setFilterStatus] = useState<TabKey>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [diffExpandedId, setDiffExpandedId] = useState<string | null>(null)
  const [diffMap, setDiffMap] = useState<Record<string, SettlementDiff | null>>({})
  const settlementBills = useWarehouseStore((s) => s.settlementBills)
  const generateSettlement = useWarehouseStore((s) => s.generateSettlement)
  const confirmSettlement = useWarehouseStore((s) => s.confirmSettlement)
  const settleSettlement = useWarehouseStore((s) => s.settleSettlement)
  const compareSettlementDiff = useWarehouseStore((s) => s.compareSettlementDiff)
  const exportSettlementToCSV = useWarehouseStore((s) => s.exportSettlementToCSV)
  const batches = useWarehouseStore((s) => s.batches)

  useEffect(() => {
    if (locState?.period) setPeriod(locState.period)
    if (locState?.ownerId) setFilterOwnerId(locState.ownerId)
  }, [locState?.period, locState?.ownerId])

  const filteredBills = useMemo(() => {
    let result = settlementBills.filter((b) => b.period === period)
    if (filterStatus !== 'all') {
      result = result.filter((b) => b.status === filterStatus)
    }
    if (filterOwnerId) {
      result = result.filter((b) => b.ownerId === filterOwnerId)
    }
    return result
  }, [settlementBills, period, filterStatus, filterOwnerId])

  const filterOwnerName = filterOwnerId
    ? (settlementBills.find((b) => b.ownerId === filterOwnerId)?.ownerName ?? batches.find((b) => b.ownerId === filterOwnerId)?.ownerName)
    : null

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const toggleDiff = (billId: string) => {
    setDiffExpandedId((prev) => {
      if (prev === billId) return null
      if (!diffMap[billId]) {
        const diff = compareSettlementDiff(billId)
        setDiffMap((m) => ({ ...m, [billId]: diff }))
      }
      return billId
    })
  }

  const handleExport = (bill: SettlementBill) => {
    const csv = exportSettlementToCSV(bill.id)
    if (csv) {
      const filename = `${bill.period}-${bill.ownerName}-对账单.csv`
      downloadCSV(filename, csv)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 font-body pb-6">
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-600">
        <h1 className="font-display text-lg font-semibold text-white px-4 pt-4 pb-2">对账结算</h1>
        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-xl bg-dark-700 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  filterStatus === tab.key
                    ? 'bg-dark-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {filterOwnerId && (
          <div className="flex items-center justify-between bg-accent-blue/10 border border-accent-blue/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-accent-blue">
              <span className="text-gray-400">筛选：</span>
              <span className="font-medium">货主「{filterOwnerName ?? filterOwnerId}」</span>
            </div>
            <button
              onClick={() => setFilterOwnerId(null)}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors"
            >
              <X size={14} />
              清除
            </button>
          </div>
        )}

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
            const isDiffExpanded = diffExpandedId === bill.id
            const diff = diffMap[bill.id]
            const isSettled = bill.status === 'settled'
            const status = statusConfig[bill.status]
            const summary = computeGroupedSummary(bill.details)
            const allDiffZero = diff && diff.amountDiff === 0 && diff.platformDiff === 0 && diff.warehouseDiff === 0 && diff.ownerDiff === 0

            return (
              <div
                key={bill.id}
                className={cn(
                  'relative bg-dark-800 rounded-xl border overflow-hidden',
                  status.borderColor
                )}
              >
                <div className={cn('absolute left-0 top-0 bottom-0 w-1', status.stripeColor)} />

                <div
                  className="pl-4 pr-4 py-3 flex items-center gap-2 cursor-pointer active:bg-dark-700/50 transition-colors"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-white text-sm font-medium truncate">{bill.ownerName}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                          status.badge.color,
                          status.badge.bg
                        )}
                      >
                        {status.badge.icon}
                        {status.badge.label}
                      </span>
                      <span className="text-[10px] text-gray-500">· {status.hintText}</span>
                      {bill.exportedAt && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-accent-green bg-accent-green/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                          已导出
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xl font-semibold text-white">¥{bill.totalStorageFee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(bill) }}
                      className="flex items-center gap-1 bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
                      title="导出CSV"
                    >
                      <Download size={12} />
                      导出
                    </button>
                    {bill.status !== 'settled' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDiff(bill.id) }}
                        className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg active:scale-95 transition-all ${
                          isDiffExpanded
                            ? 'bg-accent-purple/25 text-accent-purple'
                            : 'bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white'
                        }`}
                        title="复核差异"
                      >
                        <GitCompare size={12} />
                        复核差异
                      </button>
                    )}
                    <div className="text-gray-500 ml-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {isDiffExpanded && diff && (
                  <div className="px-4 pb-3 border-t border-dark-600 bg-dark-700/30 animate-slide-up">
                    <div className="pt-3">
                      {allDiffZero ? (
                        <div className="flex items-center justify-center gap-1.5 bg-accent-green/10 text-accent-green text-sm font-medium py-2.5 rounded-lg border border-accent-green/20">
                          <CheckCircle2 size={14} />
                          数据一致 ✓
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 gap-1.5 mb-3">
                            <DiffAmount value={diff.amountDiff} label="总金额" />
                            <DiffAmount value={diff.platformDiff} label="平台" />
                            <DiffAmount value={diff.warehouseDiff} label="仓库" />
                            <DiffAmount value={diff.ownerDiff} label="货主" />
                          </div>
                          {diff.addedDetails.length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center gap-1 text-[11px] font-medium text-accent-red mb-1.5">
                                <Plus size={11} />
                                新增明细（{diff.addedDetails.length}）
                              </div>
                              <div className="space-y-1">
                                {diff.addedDetails.map((d, i) => (
                                  <div key={`a-${i}`} className="flex items-center gap-2 bg-accent-red/8 border border-accent-red/15 rounded-md px-2 py-1.5">
                                    <Plus size={10} className="text-accent-red flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11px] text-gray-300 truncate">{d.description}</div>
                                      <div className="text-[9px] text-gray-500">{d.date}</div>
                                    </div>
                                    <span className="font-mono text-[11px] text-accent-red flex-shrink-0">+¥{d.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {diff.removedDetails.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-medium text-accent-green mb-1.5">
                                <Minus size={11} />
                                移除明细（{diff.removedDetails.length}）
                              </div>
                              <div className="space-y-1">
                                {diff.removedDetails.map((d, i) => (
                                  <div key={`r-${i}`} className="flex items-center gap-2 bg-accent-green/8 border border-accent-green/15 rounded-md px-2 py-1.5">
                                    <Minus size={10} className="text-accent-green flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11px] text-gray-300 truncate">{d.description}</div>
                                      <div className="text-[9px] text-gray-500">{d.date}</div>
                                    </div>
                                    <span className="font-mono text-[11px] text-accent-green flex-shrink-0">-¥{d.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-dark-600 animate-slide-up">
                    {(bill.confirmedAt || bill.settledAt || bill.exportedAt) && (
                      <div className="pt-3 mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        {bill.confirmedAt && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <CircleDot size={11} className="text-accent-blue" />
                            确认时间：<span className="font-mono text-gray-300">{formatDate(bill.confirmedAt)}</span>
                          </div>
                        )}
                        {bill.settledAt && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <CheckCircle2 size={11} className="text-accent-green" />
                            结算时间：<span className="font-mono text-gray-300">{formatDate(bill.settledAt)}</span>
                          </div>
                        )}
                        {bill.exportedAt && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Download size={11} className="text-accent-purple" />
                            导出时间：<span className="font-mono text-gray-300">{formatDate(bill.exportedAt)}</span>
                          </div>
                        )}
                      </div>
                    )}

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

                    <div className="flex justify-end gap-2">
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
                      {isSettled && (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500 px-4 py-2 bg-dark-700/50 rounded-lg">
                          <Lock size={14} />
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
