import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DollarSign, Package, Calendar, ChevronRight, ChevronDown, Receipt, FileText, TrendingUp } from 'lucide-react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
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
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null)
  const dailyRents = useWarehouseStore((s) => s.dailyRents)
  const commissionRecords = useWarehouseStore((s) => s.commissionRecords)
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)

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

  const monthlyTrend = useMemo(() => {
    return RECENT_MONTHS.map((month) => {
      const monthSummary = useWarehouseStore.getState().getAnalyticsSummary(month)
      const monthTotals = monthSummary.reduce(
        (acc, s) => ({
          totalRent: acc.totalRent + s.totalRent,
          totalOutboundFee: acc.totalOutboundFee + s.totalOutboundFee,
          platformIncome: acc.platformIncome + s.platformIncome,
          warehouseIncome: acc.warehouseIncome + s.warehouseIncome,
        }),
        { totalRent: 0, totalOutboundFee: 0, platformIncome: 0, warehouseIncome: 0 }
      )
      return {
        month,
        totalRent: Number(monthTotals.totalRent.toFixed(2)),
        totalOutboundFee: Number(monthTotals.totalOutboundFee.toFixed(2)),
        platformIncome: Number(monthTotals.platformIncome.toFixed(2)),
        warehouseIncome: Number(monthTotals.warehouseIncome.toFixed(2)),
      }
    }).reverse()
  }, [])

  const lines = [
    { key: 'totalRent', name: '仓租', color: '#3b82f6' },
    { key: 'totalOutboundFee', name: '出库费', color: '#f59e0b' },
    { key: 'platformIncome', name: '平台收入', color: '#a855f7' },
    { key: 'warehouseIncome', name: '仓库收入', color: '#10b981' },
  ]

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

        <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-accent-blue" />
                <h2 className="text-white font-semibold text-base">月度趋势对比</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-7">点击月份切换视图</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <defs>
                  {lines.map((line) => (
                    <linearGradient key={line.key} id={`color${line.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={line.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={line.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={(props) => {
                    const { x, y, payload } = props
                    const isActive = payload.value === period
                    return (
                      <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }} onClick={() => setPeriod(payload.value)}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="middle"
                          fill={isActive ? '#3b82f6' : '#94a3b8'}
                          fontSize={11}
                          fontWeight={isActive ? 700 : 400}
                        >
                          {payload.value.slice(2)}
                        </text>
                      </g>
                    )
                  }}
                  axisLine={{ stroke: '#2e3650' }}
                  tickLine={false}
                />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2e3650',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number, name: string) => [`¥${formatMoney(value)}`, name]}
                  labelFormatter={(label: string) => `${label}`}
                />
                {lines.map((line) => (
                  <Area
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.name}
                    stroke={line.color}
                    strokeWidth={2}
                    fill={`url(#color${line.key})`}
                    dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: line.color, stroke: '#fff', strokeWidth: 1 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-dark-600">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="text-xs text-gray-400">{line.name}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {monthlyTrend.map((m) => {
              const isActive = m.month === period
              return (
                <button
                  key={m.month}
                  onClick={() => setPeriod(m.month)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                      : 'bg-dark-700 text-gray-400 border border-dark-600 hover:bg-dark-600 hover:text-gray-300'
                  }`}
                >
                  {m.month}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          {summaryList.map((item) => {
            const isExpanded = expandedOwnerId === item.ownerId
            const ownerRents = dailyRents.filter(r => r.ownerId === item.ownerId && r.date.startsWith(period))
            const ownerRentsDisplay = ownerRents.slice(0, 8).map(r => ({
              date: r.date,
              description: `仓租-${r.location}区(${r.area}m²)`,
              amount: r.amount,
            }))
            const rentMore = Math.max(0, ownerRents.length - 8)
            const rentTotal = ownerRents.reduce((s, r) => s + r.amount, 0)

            const matchedRecordIds = new Set<string>()
            const outboundDisplay: { date: string; description: string; amount: number }[] = []
            commissionRecords
              .filter(c => c.ownerId === item.ownerId && c.createdAt.startsWith(period))
              .forEach(c => {
                matchedRecordIds.add(c.outboundOrderId)
                outboundDisplay.push({
                  date: c.createdAt,
                  description: `出库费-${c.orderNo}`,
                  amount: c.totalFee,
                })
              })
            outboundOrders
              .filter(o => o.ownerId === item.ownerId && o.status === 'shipped' && (o.shippedAt ?? o.createdAt).startsWith(period) && !matchedRecordIds.has(o.id))
              .forEach(o => {
                const fee = o.operationFee ?? o.quantity * 5
                outboundDisplay.push({
                  date: o.shippedAt ?? o.createdAt,
                  description: `出库费-${o.orderNo}`,
                  amount: fee,
                })
              })
            outboundDisplay.sort((a, b) => a.date.localeCompare(b.date))
            const outboundSlice = outboundDisplay.slice(0, 8)
            const outboundMore = Math.max(0, outboundDisplay.length - 8)
            const outboundTotal = outboundDisplay.reduce((s, d) => s + d.amount, 0)

            return (
            <div key={`${item.ownerId}-${item.period}`} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer select-none"
                onClick={() => setExpandedOwnerId(isExpanded ? null : item.ownerId)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <div>
                    <h3 className="text-white font-semibold text-base">{item.ownerName}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar size={12} />
                      <span>{item.period}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {item.settlementBillId && (
                    <button
                      onClick={() => navigate('/settlement', { state: { ownerId: item.ownerId, period: item.period } })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/30 transition-colors"
                    >
                      <Receipt size={14} />
                      <span>查看账单</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/outbound?ownerId=${item.ownerId}&period=${item.period}`)}
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

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-dark-600 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-accent-blue mb-2">仓租明细</div>
                    {ownerRentsDisplay.length === 0 ? (
                      <div className="text-xs text-gray-500 py-2">暂无仓租记录</div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          {ownerRentsDisplay.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-500 font-mono shrink-0">{r.date}</span>
                                <span className="text-gray-300 truncate">{r.description}</span>
                              </div>
                              <span className="font-mono text-white shrink-0 ml-2">¥{formatMoney(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                        {rentMore > 0 && (
                          <div className="text-xs text-gray-500 mt-1.5">还有 {rentMore} 条未展示</div>
                        )}
                        <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between text-xs">
                          <span className="text-gray-500">仓租合计</span>
                          <span className="font-mono font-semibold text-accent-blue">¥{formatMoney(rentTotal)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium text-accent-amber mb-2">出库费明细</div>
                    {outboundSlice.length === 0 ? (
                      <div className="text-xs text-gray-500 py-2">暂无出库费记录</div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          {outboundSlice.map((o, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-500 font-mono shrink-0">{o.date}</span>
                                <span className="text-gray-300 truncate">{o.description}</span>
                              </div>
                              <span className="font-mono text-white shrink-0 ml-2">¥{formatMoney(o.amount)}</span>
                            </div>
                          ))}
                        </div>
                        {outboundMore > 0 && (
                          <div className="text-xs text-gray-500 mt-1.5">还有 {outboundMore} 条未展示</div>
                        )}
                        <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between text-xs">
                          <span className="text-gray-500">出库费合计</span>
                          <span className="font-mono font-semibold text-accent-amber">¥{formatMoney(outboundTotal)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )})}

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
