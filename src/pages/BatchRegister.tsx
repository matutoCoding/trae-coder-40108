import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useWarehouseStore } from '@/store/useWarehouseStore'

export default function BatchRegister() {
  const navigate = useNavigate()
  const addBatch = useWarehouseStore((s) => s.addBatch)
  const batches = useWarehouseStore((s) => s.batches)

  const owners = useMemo(() => {
    const map = new Map<string, string>()
    batches.forEach((b) => map.set(b.ownerId, b.ownerName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [batches])

  const [form, setForm] = useState({
    batchNo: '',
    sku: '',
    skuName: '',
    location: '',
    ownerId: '',
    ownerName: '',
    productionDate: '',
    expiryDate: '',
    quantity: '',
  })
  const [errorMsg, setErrorMsg] = useState('')

  const shelfLifeDays = useMemo(() => {
    if (!form.productionDate || !form.expiryDate) return null
    const diff = Math.ceil(
      (new Date(form.expiryDate).getTime() - new Date(form.productionDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    return diff > 0 ? diff : null
  }, [form.productionDate, form.expiryDate])

  const dateError = useMemo(() => {
    if (!form.productionDate || !form.expiryDate) return false
    return new Date(form.expiryDate).getTime() <= new Date(form.productionDate).getTime()
  }, [form.productionDate, form.expiryDate])

  const batchNoDuplicate = useMemo(() => {
    if (!form.batchNo.trim()) return false
    return batches.some((b) => b.batchNo === form.batchNo.trim())
  }, [form.batchNo, batches])

  const quantityInvalid = useMemo(() => {
    if (!form.quantity) return false
    const n = Number(form.quantity)
    return !Number.isInteger(n) || n <= 0
  }, [form.quantity])

  const updateField = (field: string, value: string) => {
    const updates: Record<string, string> = { [field]: value }
    if (field === 'ownerId') {
      const owner = owners.find((o) => o.id === value)
      if (owner) updates.ownerName = owner.name
    }
    setForm((prev) => ({ ...prev, ...updates }))
    setErrorMsg('')
  }

  const handleSubmit = () => {
    setErrorMsg('')

    const result = addBatch({
      batchNo: form.batchNo,
      sku: form.sku,
      skuName: form.skuName,
      location: form.location,
      productionDate: form.productionDate,
      expiryDate: form.expiryDate,
      shelfLifeDays: shelfLifeDays ?? 0,
      quantity: Number(form.quantity),
      remainingQuantity: Number(form.quantity),
      ownerId: form.ownerId,
      ownerName: form.ownerName,
    })

    if (!result.ok) {
      setErrorMsg(result.error ?? '登记失败')
      return
    }

    navigate('/batch')
  }

  const isValid = form.batchNo.trim() && form.sku.trim() && form.skuName.trim() && form.location.trim() && form.ownerId && form.productionDate && form.expiryDate && form.quantity && !dateError && !batchNoDuplicate && !quantityInvalid

  const inputClass = 'w-full rounded-xl border bg-dark-700 border-dark-600 py-2.5 px-4 text-sm text-white placeholder:text-dark-500 font-body focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue'
  const inputErrorClass = 'w-full rounded-xl border bg-dark-700 border-accent-red/50 py-2.5 px-4 text-sm text-white placeholder:text-dark-500 font-body focus:outline-none focus:ring-2 focus:ring-accent-red/50 focus:border-accent-red'
  const labelClass = 'block text-xs text-dark-500 font-body mb-1.5'

  return (
    <div className="min-h-screen bg-dark-900 font-body flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-display font-bold text-white">批次登记</h1>
      </div>

      {errorMsg && (
        <div className="mx-4 mb-3 rounded-xl bg-accent-red/10 border border-accent-red/20 px-4 py-2.5 text-sm text-accent-red font-medium">
          {errorMsg}
        </div>
      )}

      <div className="flex-1 px-4 pb-8 space-y-4">
        <div>
          <label className={labelClass}>批号</label>
          <input
            type="text"
            value={form.batchNo}
            onChange={(e) => updateField('batchNo', e.target.value)}
            placeholder="输入批号"
            className={batchNoDuplicate ? inputErrorClass : inputClass}
          />
          {batchNoDuplicate && (
            <p className="text-xs text-accent-red mt-1">该批号已存在，请勿重复登记</p>
          )}
        </div>

        <div>
          <label className={labelClass}>SKU编码</label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => updateField('sku', e.target.value)}
            placeholder="输入SKU编码"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>品名</label>
          <input
            type="text"
            value={form.skuName}
            onChange={(e) => updateField('skuName', e.target.value)}
            placeholder="输入品名"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>库位</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="输入库位"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>货主</label>
          <select
            value={form.ownerId}
            onChange={(e) => updateField('ownerId', e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>选择货主</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>生产日期</label>
          <input
            type="date"
            value={form.productionDate}
            onChange={(e) => updateField('productionDate', e.target.value)}
            className={dateError ? inputErrorClass : inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>有效期至</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => updateField('expiryDate', e.target.value)}
            className={dateError ? inputErrorClass : inputClass}
          />
          {dateError && (
            <p className="text-xs text-accent-red mt-1">有效期必须晚于生产日期</p>
          )}
        </div>

        {shelfLifeDays !== null && !dateError && (
          <div className="rounded-xl bg-dark-800 border border-dark-700 px-4 py-2.5">
            <span className="text-xs text-dark-500 font-body">保质期天数：</span>
            <span className="text-sm text-accent-blue font-mono font-semibold ml-1">{shelfLifeDays} 天</span>
          </div>
        )}

        <div>
          <label className={labelClass}>入库数量</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => updateField('quantity', e.target.value)}
            placeholder="输入入库数量（正整数）"
            min={1}
            step={1}
            className={quantityInvalid ? inputErrorClass : inputClass}
          />
          {quantityInvalid && (
            <p className="text-xs text-accent-red mt-1">入库数量必须为正整数</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full rounded-xl bg-accent-blue py-3 text-sm font-display font-semibold text-white mt-4 disabled:opacity-40 disabled:cursor-not-allowed active:bg-accent-blue/80 transition-colors"
        >
          登记入库
        </button>
      </div>
    </div>
  )
}
