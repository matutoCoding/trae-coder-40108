import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, Lock, DollarSign, ClipboardList, Plus, FileText, ChevronRight, LogOut } from 'lucide-react'
import { useWarehouseStore, computeBatchStatus, computeDaysUntilExpiry } from '@/store/useWarehouseStore'
import StatCard from '@/components/StatCard'
import { cn } from '@/lib/utils'

function formatDate(): string {
  const d = new Date()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekdays[d.getDay()]}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const batches = useWarehouseStore((s) => s.batches)
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders)
  const dailyRents = useWarehouseStore((s) => s.dailyRents)
  const commissionRecords = useWarehouseStore((s) => s.commissionRecords)

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7)
    const monthRents = dailyRents.filter((r) => r.date.startsWith(currentMonth))
    const monthCommissions = commissionRecords.filter((c) => c.createdAt.startsWith(currentMonth))
    const monthlyFee = monthRents.reduce((s, r) => s + r.amount, 0) + monthCommissions.reduce((s, c) => s + c.totalFee, 0)
    return {
      totalBatches: batches.filter((b) => b.remainingQuantity > 0).length,
      nearExpiryCount: batches.filter((b) => computeBatchStatus(b.expiryDate) === 'nearExpiry' && b.remainingQuantity > 0).length,
      expiredCount: batches.filter((b) => computeBatchStatus(b.expiryDate) === 'expired' && b.remainingQuantity > 0).length,
      monthlyFee: Number(monthlyFee.toFixed(2)),
      pickingOrders: outboundOrders.filter((o) => o.status === 'picking').length,
      shippedOrders: outboundOrders.filter((o) => o.status === 'shipped').length,
    }
  }, [batches, outboundOrders, dailyRents, commissionRecords])

  const nearExpiryBatches = useMemo(
    () => batches.filter((b) => computeBatchStatus(b.expiryDate) === 'nearExpiry'),
    [batches]
  )

  const urgentBatches = [...nearExpiryBatches]
    .map((b) => ({ ...b, daysLeft: computeDaysUntilExpiry(b.expiryDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-dark-900 font-body pb-6">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-display font-bold text-white">云仓管理</h1>
        <p className="text-sm text-dark-500 mt-1">{formatDate()}</p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard title="在库批次" value={stats.totalBatches} icon={<Package size={18} />} color="blue" />
        <StatCard title="临期预警" value={stats.nearExpiryCount} icon={<AlertTriangle size={18} />} color="amber" />
        <StatCard title="过期锁定" value={stats.expiredCount} icon={<Lock size={18} />} color="red" />
        <StatCard title="本月仓储费" value={`¥${stats.monthlyFee.toLocaleString()}`} icon={<DollarSign size={18} />} color="green" />
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-dark-800 border-dark-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-blue/10">
              <ClipboardList className="w-4 h-4 text-accent-blue" />
            </div>
            <span className="text-sm text-white font-body">待拣货</span>
          </div>
          <span className="text-lg font-display font-bold text-accent-blue">{stats.pickingOrders}</span>
        </div>
        <div className="rounded-xl border bg-dark-800 border-dark-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-green/10">
              <LogOut className="w-4 h-4 text-accent-green" />
            </div>
            <span className="text-sm text-white font-body">已出库</span>
          </div>
          <span className="text-lg font-display font-bold text-accent-green">{stats.shippedOrders}</span>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-display font-semibold text-white">临期预警</h2>
          <button
            onClick={() => navigate('/batch')}
            className="flex items-center text-xs text-accent-blue font-body"
          >
            查看全部
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
        {urgentBatches.length > 0 ? (
          <div className="rounded-xl border bg-dark-800 border-dark-700 divide-y divide-dark-700 overflow-hidden">
            {urgentBatches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-white truncate">{b.batchNo}</p>
                  <p className="text-xs text-dark-500 font-body truncate">{b.skuName}</p>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono font-semibold ml-3 shrink-0',
                    b.daysLeft <= 7 ? 'text-accent-red' : 'text-accent-amber'
                  )}
                >
                  {b.daysLeft}天
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-dark-800 border-dark-700 p-6 text-center text-sm text-dark-500 font-body">
            暂无临期批次
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-sm font-display font-semibold text-white mb-3">快捷操作</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/batch/register')}
            className="flex flex-col items-center gap-2 rounded-xl border bg-dark-800 border-dark-700 p-4 active:bg-dark-700 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-blue/10">
              <Plus className="w-5 h-5 text-accent-blue" />
            </div>
            <span className="text-xs text-white font-body">新建批次</span>
          </button>
          <button
            onClick={() => navigate('/outbound/create')}
            className="flex flex-col items-center gap-2 rounded-xl border bg-dark-800 border-dark-700 p-4 active:bg-dark-700 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-amber/10">
              <FileText className="w-5 h-5 text-accent-amber" />
            </div>
            <span className="text-xs text-white font-body">创建出库单</span>
          </button>
          <button
            onClick={() => navigate('/settlement')}
            className="flex flex-col items-center gap-2 rounded-xl border bg-dark-800 border-dark-700 p-4 active:bg-dark-700 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-green/10">
              <DollarSign className="w-5 h-5 text-accent-green" />
            </div>
            <span className="text-xs text-white font-body">查看账单</span>
          </button>
        </div>
      </div>
    </div>
  )
}
