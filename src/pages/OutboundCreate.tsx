import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, AlertTriangle, Lock } from 'lucide-react'
import { useWarehouseStore, computeBatchStatus } from '@/store/useWarehouseStore'

interface SkuOption {
  sku: string
  skuName: string
  ownerId: string
  ownerName: string
  hasAvailableOnlyExpired: boolean
}

export default function OutboundCreate() {
  const navigate = useNavigate()
  const batches = useWarehouseStore((s) => s.batches)
  const createOutboundOrder = useWarehouseStore((s) => s.createOutboundOrder)

  const [selectedSku, setSelectedSku] = useState('')
  const [quantity, setQuantity] = useState('')
  const [skuDropdownOpen, setSkuDropdownOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState<'error' | 'success'>('error')

  const skuOptions: SkuOption[] = useMemo(() => {
    const seen = new Map<string, SkuOption>()
    for (const b of batches) {
      if (b.remainingQuantity <= 0) continue
      const bStatus = computeBatchStatus(b.expiryDate)
      if (seen.has(b.sku)) {
        const existing = seen.get(b.sku)!
        if (bStatus !== 'expired') existing.hasAvailableOnlyExpired = false
        continue
      }
      seen.set(b.sku, {
        sku: b.sku,
        skuName: b.skuName,
        ownerId: b.ownerId,
        ownerName: b.ownerName,
        hasAvailableOnlyExpired: bStatus === 'expired',
      })
    }
    return Array.from(seen.values())
  }, [batches])

  const selectedOption = skuOptions.find((o) => o.sku === selectedSku)
  const qty = parseInt(quantity) || 0

  const fifoRecommendations = useMemo(() => {
    if (!selectedSku || qty <= 0) return []
    const store = useWarehouseStore.getState()
    return store.getFIFORecommendations(selectedSku, qty)
  }, [selectedSku, qty, batches])

  const hasExpired = fifoRecommendations.some((r) => r.status === 'expired')
  const validRecommendations = fifoRecommendations.filter((r) => r.status !== 'expired')
  const totalAvailable = validRecommendations.reduce((s, r) => s + r.availableQty, 0)
  const canOutbound = validRecommendations.length > 0 && totalAvailable >= qty

  const handleSubmit = () => {
    if (!selectedOption || qty <= 0) return

    if (!canOutbound) {
      setToastMsg('可用库存不足，无法出库')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
      return
    }

    const result = createOutboundOrder(
      selectedOption.sku,
      selectedOption.skuName,
      qty,
      selectedOption.ownerId,
      selectedOption.ownerName,
    )

    if (!result) {
      setToastMsg('创建失败，库存不足')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
      return
    }

    setToastMsg('出库单创建成功')
    setToastType('success')
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      navigate('/outbound')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-dark-900 font-body">
      <div className="sticky top-0 z-10 bg-dark-800 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-white">创建出库单</h1>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-400">SKU选择</label>
            <div className="relative">
              <button
                onClick={() => setSkuDropdownOpen(!skuDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl bg-dark-800 px-4 py-3 text-left text-white"
              >
                <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
                  {selectedOption ? `${selectedOption.skuName} (${selectedOption.sku})` : '请选择SKU'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${skuDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {skuDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl bg-dark-700 py-1 shadow-xl">
                  {skuOptions.map((opt) => {
                    const isOnlyExpired = opt.hasAvailableOnlyExpired
                    return (
                      <button
                        key={opt.sku}
                        disabled={isOnlyExpired}
                        onClick={() => {
                          setSelectedSku(opt.sku)
                          setSkuDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                          isOnlyExpired
                            ? 'text-gray-600 cursor-not-allowed'
                            : selectedSku === opt.sku
                              ? 'bg-accent-blue/20 text-accent-blue'
                              : 'text-gray-300 active:bg-dark-600'
                        }`}
                      >
                        <span>
                          <span className="font-medium">{opt.skuName}</span>
                          <span className="ml-2 font-mono text-xs text-gray-500">{opt.sku}</span>
                        </span>
                        {isOnlyExpired && (
                          <span className="flex items-center gap-1 text-xs text-accent-red">
                            <Lock size={12} />
                            全部过期
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">出库数量</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="请输入出库数量"
              className="w-full rounded-xl bg-dark-800 px-4 py-3 font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">货主</label>
            <div className="rounded-xl bg-dark-800 px-4 py-3 text-gray-400">
              {selectedOption ? selectedOption.ownerName : '自动填充'}
            </div>
          </div>
        </div>

        {selectedSku && qty > 0 && fifoRecommendations.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-gray-400">FIFO推荐</h2>

            {hasExpired && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-accent-red/10 border border-accent-red/20 px-4 py-3 text-accent-red">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <span className="text-sm font-medium block">以下批次已过期，已被锁定不可出库</span>
                  <span className="text-xs opacity-80">系统仅推荐未过期批次，按效期最近优先</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {fifoRecommendations.map((rec) => {
                const isExpired = rec.status === 'expired'
                return (
                  <div
                    key={rec.batchId}
                    className={`rounded-xl bg-dark-800 p-4 ${
                      isExpired
                        ? 'border border-accent-red/30 opacity-60'
                        : 'border border-accent-blue/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-mono text-sm ${isExpired ? 'text-gray-500' : 'text-white'}`}>
                          {rec.batchNo}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          效期 <span className="font-mono">{rec.expiryDate}</span>
                        </p>
                      </div>
                      {isExpired ? (
                        <span className="flex items-center gap-1 rounded-full bg-accent-red/20 px-2 py-0.5 text-xs font-medium text-accent-red">
                          <Lock size={10} />
                          过期锁定
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent-blue/20 px-2 py-0.5 text-xs font-medium text-accent-blue">
                          FIFO推荐
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-gray-400">
                        可用 <span className={`font-mono font-medium ${isExpired ? 'text-gray-500' : 'text-white'}`}>{rec.availableQty}</span>
                      </span>
                      {!isExpired && (
                        <span className="text-gray-400">
                          推荐 <span className="font-mono font-medium text-accent-blue">{rec.recommendedQty}</span>
                        </span>
                      )}
                      <span className="text-gray-400">
                        剩余 <span className={`font-mono font-medium ${rec.daysUntilExpiry <= 0 ? 'text-accent-red' : rec.daysUntilExpiry <= 30 ? 'text-accent-amber' : 'text-white'}`}>
                          {rec.daysUntilExpiry <= 0 ? `已过期${Math.abs(rec.daysUntilExpiry)}天` : `${rec.daysUntilExpiry}天`}
                        </span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {validRecommendations.length > 0 && (
              <div className="mt-3 rounded-xl bg-dark-700 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">可出库总量</span>
                  <span className={`font-mono font-medium ${canOutbound ? 'text-accent-blue' : 'text-accent-amber'}`}>
                    {totalAvailable} {canOutbound ? '✓' : '(不足)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-dark-800/90 px-4 pb-6 pt-3 backdrop-blur-sm">
        <button
          onClick={handleSubmit}
          disabled={!selectedOption || qty <= 0 || !canOutbound}
          className="w-full rounded-xl bg-accent-blue py-3.5 text-base font-medium text-white transition-opacity disabled:opacity-40 active:opacity-80"
        >
          确认出库
        </button>
      </div>

      {showToast && (
        <div className={`fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
          toastType === 'success' ? 'bg-accent-green' : 'bg-accent-red'
        }`}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
