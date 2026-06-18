import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Inbox } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'
import BatchCard from '@/components/BatchCard'
import { cn } from '@/lib/utils'
import type { BatchStatus } from '@/types'

const tabs: { label: string; value: BatchStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '临期', value: 'nearExpiry' },
  { label: '过期锁定', value: 'expired' },
]

export default function BatchList() {
  const navigate = useNavigate()
  const batches = useWarehouseStore((s) => s.batches)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<BatchStatus | 'all'>('all')

  const filtered = useMemo(() => {
    let result = batches
    if (activeTab !== 'all') {
      result = result.filter((b) => b.status === activeTab)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (b) => b.batchNo.toLowerCase().includes(q) || b.skuName.toLowerCase().includes(q)
      )
    }
    return result
  }, [batches, activeTab, search])

  return (
    <div className="min-h-screen bg-dark-900 font-body flex flex-col">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-white">批次效期</h1>
          <button className="p-2">
            <Search className="w-5 h-5 text-dark-500" />
          </button>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索批号或品名"
            className="w-full rounded-xl border bg-dark-800 border-dark-700 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-dark-500 font-body focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-body transition-colors',
                activeTab === tab.value
                  ? 'bg-accent-blue text-white'
                  : 'bg-dark-800 text-dark-500 border border-dark-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 space-y-3 pb-24">
        {filtered.length > 0 ? (
          filtered.map((batch) => <BatchCard key={batch.id} batch={batch} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-dark-500">
            <Inbox className="w-12 h-12 mb-3" />
            <p className="text-sm font-body">暂无匹配的批次</p>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/batch/register')}
        className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full bg-accent-blue shadow-lg shadow-accent-blue/30 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  )
}
