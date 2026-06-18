import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DollarSign, Package, Calendar, ChevronRight, Receipt, FileText } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { AnalyticsSummary } from '@/types'

function getRecentMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
  }
  return months
}

const RECENT_MONTHS = getRecentMonths(6)

function formatMoney(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Analytics() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>(RECENT_MONTHS[0])

  const summaryList = useMemo<AnalyticsSummary[]>(() => {
    return useWarehouseStore.getState().getAnalyticsSummary(period)
  }, [period])

  const totals = useMemo(() => {
    return summaryList.reduce(
      (acc, s) => ({
        totalRent: acc.totalRent + s.totalRent,
        totalOutboundFee: acc.totalOutboundFee + s.totalOutboundFee,
        platformIncome: acc.platformIncome + s.platformIncome,
        warehouseIncome: acc.warehouseIncome + s.warehouseIncome,
        ownerPayable: acc.ownerPayable + s.ownerPayable,
      }),
      { totalRent: 0, totalOutboundFee: 0, platformIncome: 0, warehouseIncome: 0, ownerPayable: 0 }
    )
  }, [summaryList])

  const summaryCards = [
    { label: '总仓租', value: totals.totalRent, icon: <BarChart3 size={18} />, color: 'text-accent-blue' },
    { label: '总出库费', value: totals.totalOutboundFee, icon: <Package size={18} />, color: 'text-accent-amber' },
    { label: '平台收入', value: totals.platformIncome, icon: <DollarSign size={18} />, color: 'text-accent-blue' },
    { label: '仓库收入', value: totals.warehouseIncome, icon: <DollarSign size={18} />, color: 'text-accent-amber' },
    { label: '货主应付', value: totals.ownerPayable, icon: <DollarSign size={18} />, color: 'text-accent-green' },
  ]

  return (
    <div className="min-h-screen bg-dark-900 font-body pb-6">
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-600">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h1 className="text-xl font-display font-bold text-white">经营看板</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-dark-800 border border-dark-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-blue"
          >
            {RECENT_MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${card.color}`}>{card.icon}</div>
                <span className="text-xs text-gray-400">{card.label}</span>
              </div>
              <div className={`font-mono text-lg font-bold ${card.color}`}>
                ¥{formatMoney(card.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {summaryList.map((item) => (
            <div key={`${item.ownerId}-${item.period}`} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-base">{item.ownerName}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Calendar size={12} />
                    <span>{item.period}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.settlementBillId && (
                    <button
                      onClick={() => navigate('/settlement')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/30 transition-colors"
                    >
                      <Receipt size={14} />
                      <span>查看账单</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/outbound?ownerId=${item.ownerId}`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-dark-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-dark-600 transition-colors"
                  >
                    <FileText size={14} />
                    <span>出库明细</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-dark-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">仓租</div>
                  <div className="font-mono text-accent-blue font-semibold">¥{formatMoney(item.totalRent)}</div>
                </div>
                <div className="bg-dark-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">出库费</div>
                  <div className="font-mono text-accent-amber font-semibold">¥{formatMoney(item.totalOutboundFee)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-2 py-2 text-center">
                  <div className="text-[10px] text-accent-blue font-medium mb-0.5">平台</div>
                  <div className="font-mono text-xs text-white">¥{formatMoney(item.platformIncome)}</div>
                </div>
                <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg px-2 py-2 text-center">
                  <div className="text-[10px] text-accent-amber font-medium mb-0.5">仓库</div>
                  <div className="font-mono text-xs text-white">¥{formatMoney(item.warehouseIncome)}</div>
                </div>
                <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg px-2 py-2 text-center">
                  <div className="text-[10px] text-accent-green font-medium mb-0.5">货主</div>
                  <div className="font-mono text-xs text-white">¥{formatMoney(item.ownerPayable)}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Package size={12} className="text-accent-amber" />
                  <span>出库单数 <span className="text-white font-mono">{item.outboundCount}</span> 单</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-accent-blue" />
                  <span>仓租天数 <span className="text-white font-mono">{item.rentDays}</span> 天</span>
                </div>
              </div>
            </div>
          ))}

          {summaryList.length === 0 && (
            <div className="bg-dark-800 rounded-xl p-8 border border-dark-600 text-center">
              <BarChart3 size={40} className="text-dark-500 mx-auto mb-3" />
              <div className="text-gray-500 text-sm">该月份暂无经营数据</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
