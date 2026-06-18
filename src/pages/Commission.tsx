import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Settings, Wallet, Building2, Pencil, Check, X } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import type { CommissionRule } from '@/types'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b']
const PIE_LABELS = ['平台', '仓库', '货主']

type TabKey = 'config' | 'income' | 'rent'

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'config', label: '抽成配置', icon: <Settings size={16} /> },
  { key: 'income', label: '收入归集', icon: <Wallet size={16} /> },
  { key: 'rent', label: '仓租计费', icon: <Building2 size={16} /> },
]

export default function Commission() {
  const [activeTab, setActiveTab] = useState<TabKey>('config')
  const commissionRules = useWarehouseStore((s) => s.commissionRules)
  const commissionRecords = useWarehouseStore((s) => s.commissionRecords)
  const dailyRents = useWarehouseStore((s) => s.dailyRents)
  const updateCommissionRule = useWarehouseStore((s) => s.updateCommissionRule)

  return (
    <div className="min-h-screen bg-dark-900 font-body pb-6">
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-600">
        <h1 className="font-display text-lg font-semibold text-white px-4 pt-4 pb-3">抽成分配</h1>
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-accent-blue border-accent-blue'
                  : 'text-dark-500 border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {activeTab === 'config' && <ConfigTab rules={commissionRules} onUpdate={updateCommissionRule} />}
        {activeTab === 'income' && <IncomeTab records={commissionRecords} />}
        {activeTab === 'rent' && <RentTab rents={dailyRents} />}
      </div>
    </div>
  )
}

function ConfigTab({ rules, onUpdate }: { rules: CommissionRule[]; onUpdate: (id: string, updates: Partial<CommissionRule>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRates, setEditRates] = useState<{ platformRate: number; warehouseRate: number; ownerRate: number } | null>(null)

  const startEdit = (rule: CommissionRule) => {
    setEditingId(rule.id)
    setEditRates({
      platformRate: Math.round(rule.platformRate * 100),
      warehouseRate: Math.round(rule.warehouseRate * 100),
      ownerRate: Math.round(rule.ownerRate * 100),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRates(null)
  }

  const saveEdit = () => {
    if (!editRates || !editingId) return
    onUpdate(editingId, {
      platformRate: editRates.platformRate / 100,
      warehouseRate: editRates.warehouseRate / 100,
      ownerRate: editRates.ownerRate / 100,
    })
    setEditingId(null)
    setEditRates(null)
  }

  const adjustRate = (key: 'platformRate' | 'warehouseRate', value: number) => {
    if (!editRates) return
    const clampedKey = Math.min(Math.max(value, 0), 100)
    const newOtherKey = key === 'platformRate' ? editRates.warehouseRate : editRates.platformRate
    const remaining = 100 - clampedKey
    const newOwnerRate = remaining - newOtherKey

    if (newOwnerRate < 0) {
      const maxKey = 100 - newOtherKey
      const finalKey = Math.min(clampedKey, maxKey)
      setEditRates({
        ...editRates,
        [key]: finalKey,
        ownerRate: 0,
      })
    } else {
      setEditRates({
        ...editRates,
        [key]: clampedKey,
        ownerRate: newOwnerRate,
      })
    }
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => {
        const isEditing = editingId === rule.id
        const pRate = isEditing ? (editRates?.platformRate ?? 0) : Math.round(rule.platformRate * 100)
        const wRate = isEditing ? (editRates?.warehouseRate ?? 0) : Math.round(rule.warehouseRate * 100)
        const oRate = isEditing ? (editRates?.ownerRate ?? 0) : Math.round(rule.ownerRate * 100)
        const total = pRate + wRate + oRate
        const pieData = [
          { name: '平台', value: pRate },
          { name: '仓库', value: wRate },
          { name: '货主', value: oRate },
        ]

        return (
          <div key={rule.id} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">{rule.ownerName}</span>
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-dark-700 text-accent-red hover:bg-dark-600 transition-colors">
                    <X size={16} />
                  </button>
                  <button onClick={saveEdit} className="p-1.5 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg bg-dark-700 text-accent-blue hover:bg-dark-600 transition-colors">
                  <Pencil size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={44} strokeWidth={0}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {(['platformRate', 'warehouseRate', 'ownerRate'] as const).map((key, i) => {
                  const rateValue = isEditing ? (editRates?.[key] ?? 0) : [pRate, wRate, oRate][i]
                  const isAuto = isEditing && key === 'ownerRate'
                  const editableKey = key as 'platformRate' | 'warehouseRate'
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-gray-400">{PIE_LABELS[i]}{isAuto ? ' (自动)' : ''}</span>
                        </span>
                        <span className="font-mono text-white">{rateValue}%</span>
                      </div>
                      {isEditing && !isAuto && (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={rateValue}
                          onChange={(e) => adjustRate(editableKey, Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none bg-dark-600 cursor-pointer"
                          style={{ accentColor: PIE_COLORS[i] }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`mt-3 text-xs font-mono text-center ${total === 100 ? 'text-accent-green' : 'text-accent-red'}`}>
              合计 {total}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

function IncomeTab({ records }: { records: ReturnType<typeof useWarehouseStore.getState>['commissionRecords'] }) {
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const orderMap = useMemo(() => {
    const map = new Map<string, typeof outboundOrders[number]>()
    outboundOrders.forEach((o) => map.set(o.id, o))
    return map
  }, [outboundOrders])

  const { shippedRecords, abnormalRecords } = useMemo(() => {
    const shipped: typeof records = []
    const abnormal: typeof records = []
    records.forEach((r) => {
      const order = r.outboundOrderId ? orderMap.get(r.outboundOrderId) : undefined
      if (!order || order.status === 'shipped') {
        shipped.push(r)
      } else {
        abnormal.push(r)
      }
    })
    return { shippedRecords: shipped, abnormalRecords: abnormal }
  }, [records, orderMap])

  const totalIncome = shippedRecords.reduce((s, r) => s + r.totalFee, 0)
  const platformTotal = shippedRecords.reduce((s, r) => s + r.platformShare, 0)
  const warehouseTotal = shippedRecords.reduce((s, r) => s + r.warehouseShare, 0)

  const getStatusText = (status: string) => {
    if (status === 'picking') return '待拣货'
    if (status === 'picked') return '已拣货'
    return status
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="总收入" value={totalIncome} color="text-white" />
          <SummaryCard label="平台收入" value={platformTotal} color="text-accent-blue" />
          <SummaryCard label="仓库收入" value={warehouseTotal} color="text-accent-green" />
        </div>
        <div className="text-center text-[10px] text-gray-500">仅包含已出库订单的收入</div>
      </div>

      {abnormalRecords.length > 0 && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-accent-red">⚠</span>
            <span className="text-sm font-medium text-accent-red">异常流水（尚未出库）</span>
          </div>
          <div className="text-[11px] text-gray-400 mb-3">需等确认出库后才计入收入</div>
          <div className="space-y-2">
            {abnormalRecords.map((record) => {
              const order = record.outboundOrderId ? orderMap.get(record.outboundOrderId) : undefined
              return (
                <div key={record.id} className="bg-dark-800/50 rounded-lg p-3 border border-dark-600">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-gray-400">{record.orderNo}</span>
                    <span className="text-[10px] text-accent-red">状态：{order ? getStatusText(order.status) : '未知'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white">{record.ownerName}</span>
                    <span className="font-mono text-xs text-accent-red">¥{record.totalFee.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {shippedRecords.map((record) => {
          const sumCheck = Math.abs(record.platformShare + record.warehouseShare + record.ownerShare - record.totalFee) < 0.01
          return (
            <div key={record.id} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-gray-400">{record.orderNo}</span>
                <span className="text-xs text-gray-500">{record.createdAt}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm">{record.ownerName}</span>
                <span className="font-mono text-white font-semibold">¥{record.totalFee.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-700 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[10px] text-accent-blue mb-0.5">平台</div>
                  <div className="font-mono text-xs text-white">¥{record.platformShare.toFixed(2)}</div>
                </div>
                <div className="bg-dark-700 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[10px] text-accent-green mb-0.5">仓库</div>
                  <div className="font-mono text-xs text-white">¥{record.warehouseShare.toFixed(2)}</div>
                </div>
                <div className="bg-dark-700 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[10px] text-accent-amber mb-0.5">货主</div>
                  <div className="font-mono text-xs text-white">¥{record.ownerShare.toFixed(2)}</div>
                </div>
              </div>
              <div className={`mt-2 text-[10px] font-mono text-right ${sumCheck ? 'text-accent-green' : 'text-accent-red'}`}>
                三方合计 ¥{(record.platformShare + record.warehouseShare + record.ownerShare).toFixed(2)} {sumCheck ? '✓' : '⚠'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-dark-800 rounded-xl p-3 border border-dark-600 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`font-mono text-sm font-semibold ${color}`}>¥{value.toFixed(2)}</div>
    </div>
  )
}

function RentTab({ rents }: { rents: ReturnType<typeof useWarehouseStore.getState>['dailyRents'] }) {
  const chartData = useMemo(() => {
    const todayDate = new Date()
    const days: { date: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayTotal = rents.filter((r) => r.date === dateStr).reduce((s, r) => s + r.amount, 0)
      days.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, total: Number(dayTotal.toFixed(2)) })
    }
    return days
  }, [rents])

  const ownerGroups = useMemo(() => {
    const map = new Map<string, { ownerName: string; locations: { location: string; area: number; dailyRate: number; dailyAmount: number }[] }>()
    rents.forEach((r) => {
      if (!map.has(r.ownerId)) {
        map.set(r.ownerId, { ownerName: r.ownerName, locations: [] })
      }
      const group = map.get(r.ownerId)!
      const existing = group.locations.find((l) => l.location === r.location)
      if (!existing) {
        group.locations.push({ location: r.location, area: r.area, dailyRate: r.dailyRate, dailyAmount: r.amount })
      }
    })
    return Array.from(map.entries()).map(([ownerId, data]) => ({ ownerId, ...data }))
  }, [rents])

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
        <h3 className="text-sm font-medium text-white mb-3">近7日仓租</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#2e3650' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#2e3650' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2e3650', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#3b82f6' }}
                formatter={(value: number) => [`¥${value.toFixed(2)}`, '仓租']}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3">
        {ownerGroups.map((group) => (
          <div key={group.ownerId} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
            <h4 className="text-white font-medium text-sm mb-3">{group.ownerName}</h4>
            <div className="space-y-2">
              {group.locations.map((loc) => (
                <div key={loc.location} className="flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-gray-400">{loc.location}区</div>
                    <div className="text-xs text-gray-500">{loc.area}m² · ¥{loc.dailyRate}/m²/天</div>
                  </div>
                  <span className="font-mono text-sm text-accent-amber">¥{loc.dailyAmount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
