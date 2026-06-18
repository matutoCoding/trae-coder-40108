import { create } from 'zustand'
import type {
  Batch, OutboundOrder, OutboundBatchItem, CommissionRule, CommissionRecord,
  DailyRent, SettlementBill, SettlementDetail, ExpiryAlertConfig, FIFORecommendation,
  BatchStatus, AnalyticsSummary, SettlementDiff
} from '@/types'
import {
  initialBatches, initialOutboundOrders, initialCommissionRules, initialCommissionRecords,
  initialDailyRents, initialSettlementBills, initialAlertConfig
} from '@/data/mockData'

interface WarehouseState {
  batches: Batch[]
  outboundOrders: OutboundOrder[]
  commissionRules: CommissionRule[]
  commissionRecords: CommissionRecord[]
  dailyRents: DailyRent[]
  settlementBills: SettlementBill[]
  alertConfig: ExpiryAlertConfig

  computeBatchStatus: (expiryDate: string) => BatchStatus
  getBatchStatusMap: () => Record<string, BatchStatus>

  addBatch: (batch: Omit<Batch, 'id' | 'createdAt'>) => { ok: boolean; error?: string }

  createOutboundOrder: (sku: string, skuName: string, quantity: number, ownerId: string, ownerName: string) => OutboundOrder | null
  pickOutboundOrder: (id: string) => boolean
  shipOutboundOrder: (id: string) => boolean
  getFIFORecommendations: (sku: string, quantity: number) => FIFORecommendation[]

  addCommissionRule: (rule: Omit<CommissionRule, 'id'>) => void
  updateCommissionRule: (id: string, rule: Partial<CommissionRule>) => void

  generateSettlement: (period: string) => void
  confirmSettlement: (id: string) => void
  settleSettlement: (id: string) => void
  compareSettlementDiff: (id: string) => SettlementDiff | null
  exportSettlementToCSV: (id: string) => string

  getAnalyticsSummary: (period: string, ownerId?: string) => AnalyticsSummary[]
}

const STORAGE_KEY = 'cloud-warehouse-state-v2'

function loadState(): Partial<WarehouseState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(state: WarehouseState) {
  try {
    const toSave = {
      batches: state.batches,
      outboundOrders: state.outboundOrders,
      commissionRules: state.commissionRules,
      commissionRecords: state.commissionRecords,
      dailyRents: state.dailyRents,
      settlementBills: state.settlementBills,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {}
}

const persisted = loadState()

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
export const today = () => new Date().toISOString().split('T')[0]

export const computeDaysUntilExpiry = (expiryDate: string): number => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export const computeBatchStatus = (expiryDate: string, config: ExpiryAlertConfig = initialAlertConfig): BatchStatus => {
  const diffDays = computeDaysUntilExpiry(expiryDate)
  if (diffDays <= 0) return 'expired'
  if (diffDays <= config.warningLevel1Days) return 'nearExpiry'
  return 'normal'
}

export const splitFee = (totalFee: number, platformRate: number, warehouseRate: number) => {
  const platformShare = Math.round(totalFee * platformRate * 100) / 100
  const warehouseShare = Math.round(totalFee * warehouseRate * 100) / 100
  const ownerShare = Math.round((totalFee - platformShare - warehouseShare) * 100) / 100
  return { platformShare, warehouseShare, ownerShare }
}

const OPERATION_FEE_UNIT = 5

const isBatchExpired = (expiryDate: string) => computeDaysUntilExpiry(expiryDate) <= 0

const buildDetailsForOwner = (
  ownerId: string, period: string,
  dailyRents: DailyRent[], commissionRecords: CommissionRecord[], outboundOrders: OutboundOrder[],
  commissionRules: CommissionRule[],
): { details: SettlementDetail[]; pRate: number; wRate: number } => {
  const owner = dailyRents.find(r => r.ownerId === ownerId)
          ?? commissionRecords.find(c => c.ownerId === ownerId)
          ?? outboundOrders.find(o => o.ownerId === ownerId)
  const ownerName = owner?.ownerName ?? ''
  const rule = commissionRules.find(r => r.ownerId === ownerId)
  const pRate = rule?.platformRate ?? 0.1
  const wRate = rule?.warehouseRate ?? 0.6

  const ownerRents = dailyRents.filter(r => r.ownerId === ownerId && r.date.startsWith(period))
  const ownerOrders = outboundOrders.filter(o => o.ownerId === ownerId && o.status === 'shipped' && (o.shippedAt ?? o.createdAt).startsWith(period))

  const orderFeeMap = new Map<string, number>()
  ownerOrders.forEach(o => { orderFeeMap.set(o.id, (o.operationFee ?? o.quantity * OPERATION_FEE_UNIT)) })

  const matchedRecordIds = new Set<string>()
  const rentDetails = ownerRents.map(r => {
    const { platformShare, warehouseShare, ownerShare } = splitFee(r.amount, pRate, wRate)
    return {
      type: 'daily_rent' as const,
      referenceId: r.id,
      description: `仓租-${r.location}区(${r.area}m²)`,
      amount: r.amount,
      platformShare, warehouseShare, ownerShare,
      date: r.date,
    }
  })
  const feeDetails: SettlementDetail[] = []

  commissionRecords
    .filter(c => c.ownerId === ownerId && c.createdAt.startsWith(period))
    .forEach(c => {
      matchedRecordIds.add(c.outboundOrderId)
      feeDetails.push({
        type: 'outbound_fee' as const,
        referenceId: c.id,
        description: `出库操作费-${c.orderNo}`,
        amount: c.totalFee,
        platformShare: c.platformShare,
        warehouseShare: c.warehouseShare,
        ownerShare: c.ownerShare,
        date: c.createdAt,
      })
    })

  outboundOrders
    .filter(o => o.ownerId === ownerId && o.status === 'shipped' && (o.shippedAt ?? o.createdAt).startsWith(period) && !matchedRecordIds.has(o.id))
    .forEach(o => {
      const fee = o.operationFee ?? o.quantity * OPERATION_FEE_UNIT
      const { platformShare, warehouseShare, ownerShare } = splitFee(fee, pRate, wRate)
      feeDetails.push({
        type: 'outbound_fee' as const,
        referenceId: o.id,
        description: `出库操作费-${o.orderNo}`,
        amount: fee,
        platformShare, warehouseShare, ownerShare,
        date: o.shippedAt ?? o.createdAt,
      })
    })

  return { details: [...rentDetails, ...feeDetails], pRate, wRate }
}

const sumBillFromDetails = (details: SettlementDetail[]) => {
  const totalStorageFee = Math.round(details.reduce((s, d) => s + d.amount, 0) * 100) / 100
  const platformIncome = Math.round(details.reduce((s, d) => s + d.platformShare, 0) * 100) / 100
  const warehouseIncome = Math.round(details.reduce((s, d) => s + d.warehouseShare, 0) * 100) / 100
  const ownerPayable = Math.round((totalStorageFee - platformIncome - warehouseIncome) * 100) / 100
  return { totalStorageFee, platformIncome, warehouseIncome, ownerPayable }
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  batches: (persisted?.batches as Batch[]) ?? initialBatches,
  outboundOrders: (() => {
    const raw = persisted?.outboundOrders as OutboundOrder[] | any[] | undefined
    if (!raw) return initialOutboundOrders
    type OldStatus = 'pending' | 'confirmed' | 'completed'
    return raw.map((o: any): OutboundOrder => {
      const s: OldStatus | OutboundOrder['status'] = o.status
      let status: OutboundOrder['status'] = 'picking'
      let shippedAt: string | undefined = undefined
      let pickedAt: string | undefined = undefined
      if (s === 'completed' || s === 'confirmed' || s === 'shipped') {
        status = 'shipped'
        shippedAt = (o as any).shippedAt ?? (o as any).confirmedAt ?? o.createdAt
        pickedAt = (o as any).pickedAt ?? (o as any).confirmedAt ?? o.createdAt
      } else if (s === 'picked') {
        status = 'picked'
        pickedAt = (o as any).pickedAt ?? o.createdAt
      }
      return {
        ...o,
        status,
        operationFee: (o as any).operationFee ?? o.quantity * OPERATION_FEE_UNIT,
        pickedAt,
        shippedAt,
      }
    })
  })(),
  commissionRules: (persisted?.commissionRules as CommissionRule[]) ?? initialCommissionRules,
  commissionRecords: (persisted?.commissionRecords as CommissionRecord[]) ?? initialCommissionRecords,
  dailyRents: (persisted?.dailyRents as DailyRent[]) ?? initialDailyRents,
  settlementBills: (persisted?.settlementBills as SettlementBill[]) ?? initialSettlementBills,
  alertConfig: initialAlertConfig,

  computeBatchStatus: (expiryDate) => computeBatchStatus(expiryDate, get().alertConfig),

  getBatchStatusMap: () => {
    const { batches, alertConfig } = get()
    const map: Record<string, BatchStatus> = {}
    batches.forEach(b => { map[b.id] = computeBatchStatus(b.expiryDate, alertConfig) })
    return map
  },

  addBatch: (batchData) => {
    const state = get()

    if (!batchData.batchNo.trim()) return { ok: false, error: '批号不能为空' }
    if (state.batches.some(b => b.batchNo === batchData.batchNo.trim())) {
      return { ok: false, error: '批号已存在，请勿重复登记' }
    }
    if (!batchData.sku.trim()) return { ok: false, error: 'SKU编码不能为空' }
    if (!batchData.skuName.trim()) return { ok: false, error: '品名不能为空' }
    if (!batchData.location.trim()) return { ok: false, error: '库位不能为空' }
    if (!batchData.productionDate) return { ok: false, error: '请选择生产日期' }
    if (!batchData.expiryDate) return { ok: false, error: '请选择有效期' }

    const prodDate = new Date(batchData.productionDate)
    const expDate = new Date(batchData.expiryDate)
    prodDate.setHours(0, 0, 0, 0)
    expDate.setHours(0, 0, 0, 0)
    if (expDate.getTime() <= prodDate.getTime()) {
      return { ok: false, error: '有效期必须晚于生产日期' }
    }

    const qty = Number(batchData.quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      return { ok: false, error: '入库数量必须为正整数' }
    }

    const shelfLifeDays = Math.ceil((expDate.getTime() - prodDate.getTime()) / (1000 * 60 * 60 * 24))

    const batch: Batch = {
      ...batchData,
      batchNo: batchData.batchNo.trim(),
      quantity: qty,
      remainingQuantity: qty,
      shelfLifeDays,
      id: `B${generateId()}`,
      createdAt: today(),
    }

    set(state => {
      const next = { batches: [batch, ...state.batches] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return { ok: true }
  },

  createOutboundOrder: (sku, skuName, quantity, ownerId, ownerName) => {
    const state = get()
    const recommendations = state.getFIFORecommendations(sku, quantity)
    const validRecs = recommendations.filter(r => r.status !== 'expired')

    const totalAvailable = validRecs.reduce((sum, r) => sum + r.availableQty, 0)
    if (totalAvailable < quantity) return null

    let remaining = quantity
    const batchItems: OutboundBatchItem[] = []

    for (const rec of validRecs) {
      if (remaining <= 0) break
      const take = Math.min(remaining, rec.availableQty)
      batchItems.push({
        batchId: rec.batchId,
        batchNo: rec.batchNo,
        quantity: take,
        expiryDate: rec.expiryDate,
        isFifoRecommended: true,
      })
      remaining -= take
    }

    if (remaining > 0) return null

    for (const item of batchItems) {
      if (isBatchExpired(item.expiryDate)) return null
    }

    const order: OutboundOrder = {
      id: `OB${generateId()}`,
      orderNo: `OUT-${today().replace(/-/g, '')}-${String(state.outboundOrders.length + 1).padStart(3, '0')}`,
      sku, skuName, quantity,
      batches: batchItems,
      status: 'picking',
      createdAt: today(),
      ownerId, ownerName,
      operationFee: quantity * OPERATION_FEE_UNIT,
    }

    set(state => {
      const next = { outboundOrders: [order, ...state.outboundOrders] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return order
  },

  pickOutboundOrder: (id) => {
    const state = get()
    const order = state.outboundOrders.find(o => o.id === id)
    if (!order || order.status !== 'picking') return false

    for (const item of order.batches) {
      if (isBatchExpired(item.expiryDate)) return false
      const batch = state.batches.find(b => b.id === item.batchId)
      if (!batch || batch.remainingQuantity < item.quantity) return false
    }

    set(state => {
      const next = {
        outboundOrders: state.outboundOrders.map(o =>
          o.id === id ? { ...o, status: 'picked' as const, pickedAt: today() } : o
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return true
  },

  shipOutboundOrder: (id) => {
    const state = get()
    const order = state.outboundOrders.find(o => o.id === id)
    if (!order || (order.status !== 'picking' && order.status !== 'picked')) return false

    for (const item of order.batches) {
      if (isBatchExpired(item.expiryDate)) return false
    }

    let updatedBatches = [...state.batches]
    for (const item of order.batches) {
      const idx = updatedBatches.findIndex(b => b.id === item.batchId)
      if (idx === -1) return false
      const b = updatedBatches[idx]
      if (b.remainingQuantity < item.quantity) return false
      updatedBatches[idx] = { ...b, remainingQuantity: b.remainingQuantity - item.quantity }
    }

    const rule = state.commissionRules.find(r => r.ownerId === order.ownerId)
    const pRate = rule?.platformRate ?? 0.1
    const wRate = rule?.warehouseRate ?? 0.6
    const totalFee = order.operationFee ?? order.quantity * OPERATION_FEE_UNIT

    const alreadyHasRecord = state.commissionRecords.some(r => r.outboundOrderId === id)
    const newRecords = [...state.commissionRecords]
    if (!alreadyHasRecord) {
      const { platformShare, warehouseShare, ownerShare } = splitFee(totalFee, pRate, wRate)
      newRecords.unshift({
        id: `CR${generateId()}`,
        outboundOrderId: order.id,
        orderNo: order.orderNo,
        totalFee,
        platformShare, warehouseShare, ownerShare,
        ownerId: order.ownerId,
        ownerName: order.ownerName,
        createdAt: today(),
      })
    }

    set(state => {
      const next = {
        outboundOrders: state.outboundOrders.map(o =>
          o.id === id ? { ...o, status: 'shipped' as const, shippedAt: today(), operationFee: totalFee } : o
        ),
        batches: updatedBatches,
        commissionRecords: newRecords,
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return true
  },

  getFIFORecommendations: (sku, quantity) => {
    const { batches, alertConfig } = get()
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const skuBatches = batches
      .filter(b => b.sku === sku && b.remainingQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    const nonExpired = skuBatches.filter(b => !isBatchExpired(b.expiryDate))
    const expired = skuBatches.filter(b => isBatchExpired(b.expiryDate))

    let remaining = quantity
    const recommendations: FIFORecommendation[] = []

    for (const batch of nonExpired) {
      const daysUntilExpiry = computeDaysUntilExpiry(batch.expiryDate)
      const take = remaining > 0 ? Math.min(remaining, batch.remainingQuantity) : 0
      recommendations.push({
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        availableQty: batch.remainingQuantity,
        recommendedQty: take,
        status: computeBatchStatus(batch.expiryDate, alertConfig),
        daysUntilExpiry,
      })
      if (remaining > 0) remaining -= take
    }

    for (const batch of expired) {
      recommendations.push({
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        availableQty: batch.remainingQuantity,
        recommendedQty: 0,
        status: 'expired',
        daysUntilExpiry: computeDaysUntilExpiry(batch.expiryDate),
      })
    }

    return recommendations
  },

  addCommissionRule: (ruleData) => {
    const rule: CommissionRule = { ...ruleData, id: `R${generateId()}` }
    set(state => {
      const next = { commissionRules: [...state.commissionRules, rule] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  updateCommissionRule: (id, updates) => {
    set(state => {
      const next = {
        commissionRules: state.commissionRules.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  generateSettlement: (period) => {
    const state = get()
    const ownerIds = new Set<string>()
    state.batches.forEach(b => ownerIds.add(b.ownerId))
    state.dailyRents.forEach(r => ownerIds.add(r.ownerId))
    state.outboundOrders.forEach(o => ownerIds.add(o.ownerId))

    const existingByPeriod = state.settlementBills.filter(b => b.period === period)
    const settledBillIds = new Set(existingByPeriod.filter(b => b.status === 'settled').map(b => b.id))
    const unsettledByOwner = new Map<string, SettlementBill>()
    existingByPeriod.filter(b => b.status !== 'settled').forEach(b => unsettledByOwner.set(b.ownerId, b))

    const newBills: SettlementBill[] = []

    for (const ownerId of ownerIds) {
      const existingSettled = existingByPeriod.find(b => b.ownerId === ownerId && b.status === 'settled')
      if (existingSettled) continue

      const ownerInfo = state.batches.find(b => b.ownerId === ownerId)
              ?? state.dailyRents.find(r => r.ownerId === ownerId)
              ?? state.outboundOrders.find(o => o.ownerId === ownerId)
      if (!ownerInfo) continue
      const ownerName = ownerInfo.ownerName

      const { details } = buildDetailsForOwner(
        ownerId, period, state.dailyRents, state.commissionRecords, state.outboundOrders, state.commissionRules
      )
      if (details.length === 0) continue

      const sum = sumBillFromDetails(details)

      const existingUnsettled = unsettledByOwner.get(ownerId)
      newBills.push({
        id: existingUnsettled?.id ?? `SB${generateId()}`,
        period, ownerId, ownerName,
        ...sum,
        status: existingUnsettled?.status ?? 'pending',
        createdAt: existingUnsettled?.createdAt ?? today(),
        confirmedAt: existingUnsettled?.confirmedAt,
        settledAt: existingUnsettled?.settledAt,
        exportedAt: existingUnsettled?.exportedAt,
        details,
      })
    }

    set(state => {
      const finalBills = [
        ...newBills,
        ...state.settlementBills.filter(b => b.period !== period || settledBillIds.has(b.id)),
      ]
      const next = { settlementBills: finalBills }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  confirmSettlement: (id) => {
    set(state => {
      const next = {
        settlementBills: state.settlementBills.map(b =>
          b.id === id ? { ...b, status: 'confirmed' as const, confirmedAt: today() } : b
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  settleSettlement: (id) => {
    set(state => {
      const next = {
        settlementBills: state.settlementBills.map(b =>
          b.id === id ? { ...b, status: 'settled' as const, settledAt: today() } : b
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  compareSettlementDiff: (id) => {
    const state = get()
    const bill = state.settlementBills.find(b => b.id === id)
    if (!bill) return null

    const { details: freshDetails } = buildDetailsForOwner(
      bill.ownerId, bill.period, state.dailyRents, state.commissionRecords, state.outboundOrders, state.commissionRules
    )
    const freshKeyed = new Map(freshDetails.map(d => [`${d.type}-${d.referenceId}`, d]))
    const billKeyed = new Map(bill.details.map(d => [`${d.type}-${d.referenceId}`, d]))

    const addedDetails: SettlementDetail[] = []
    freshKeyed.forEach((d, key) => { if (!billKeyed.has(key)) addedDetails.push(d) })

    const removedDetails: SettlementDetail[] = []
    billKeyed.forEach((d, key) => { if (!freshKeyed.has(key)) removedDetails.push(d) })

    const addedSum = sumBillFromDetails(addedDetails)
    const removedSum = sumBillFromDetails(removedDetails)

    return {
      addedDetails, removedDetails,
      amountDiff: Math.round((addedSum.totalStorageFee - removedSum.totalStorageFee) * 100) / 100,
      platformDiff: Math.round((addedSum.platformIncome - removedSum.platformIncome) * 100) / 100,
      warehouseDiff: Math.round((addedSum.warehouseIncome - removedSum.warehouseIncome) * 100) / 100,
      ownerDiff: Math.round((addedSum.ownerPayable - removedSum.ownerPayable) * 100) / 100,
    }
  },

  exportSettlementToCSV: (id) => {
    const state = get()
    const bill = state.settlementBills.find(b => b.id === id)
    if (!bill) return ''

    set(s => {
      const next = {
        settlementBills: s.settlementBills.map(b => b.id === id ? { ...b, exportedAt: today() } : b),
      }
      saveState({ ...s, ...next } as WarehouseState)
      return next
    })

    const header = [
      '账期', '货主ID', '货主名称', '类型', '参考编号', '描述', '日期',
      '金额(元)', '平台分成(元)', '仓库分成(元)', '货主应付(元)'
    ]
    const rows = bill.details.map(d => [
      bill.period, bill.ownerId, bill.ownerName,
      d.type === 'daily_rent' ? '仓租' : '出库操作费',
      d.referenceId, d.description, d.date,
      d.amount.toFixed(2), d.platformShare.toFixed(2), d.warehouseShare.toFixed(2), d.ownerShare.toFixed(2),
    ])
    const summary = [
      bill.period, bill.ownerId, bill.ownerName, '合计', bill.id, '账单汇总',
      bill.createdAt,
      bill.totalStorageFee.toFixed(2),
      bill.platformIncome.toFixed(2),
      bill.warehouseIncome.toFixed(2),
      bill.ownerPayable.toFixed(2),
    ]
    const all = [header, ...rows, summary]
    return all.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  },

  getAnalyticsSummary: (period, ownerIdFilter) => {
    const state = get()
    const ownerIds = new Set<string>()
    if (ownerIdFilter) {
      ownerIds.add(ownerIdFilter)
    } else {
      state.dailyRents.forEach(r => ownerIds.add(r.ownerId))
      state.outboundOrders.forEach(o => ownerIds.add(o.ownerId))
    }

    const result: AnalyticsSummary[] = []
    for (const ownerId of ownerIds) {
      const { details } = buildDetailsForOwner(
        ownerId, period, state.dailyRents, state.commissionRecords, state.outboundOrders, state.commissionRules
      )
      const sum = sumBillFromDetails(details)
      const totalRent = Math.round(
        details.filter(d => d.type === 'daily_rent').reduce((s, d) => s + d.amount, 0) * 100
      ) / 100
      const totalOutboundFee = Math.round(
        details.filter(d => d.type === 'outbound_fee').reduce((s, d) => s + d.amount, 0) * 100
      ) / 100
      const rentDays = details.filter(d => d.type === 'daily_rent').length
      const outboundCount = details.filter(d => d.type === 'outbound_fee').length

      const ownerInfo = state.batches.find(b => b.ownerId === ownerId)
              ?? state.dailyRents.find(r => r.ownerId === ownerId)
              ?? state.outboundOrders.find(o => o.ownerId === ownerId)
      const ownerName = ownerInfo?.ownerName ?? ''

      const periodBills = state.settlementBills.filter(b => b.period === period && b.ownerId === ownerId)
      const settlementBillId = periodBills[0]?.id

      result.push({
        period, ownerId, ownerName,
        totalRent, totalOutboundFee,
        platformIncome: sum.platformIncome,
        warehouseIncome: sum.warehouseIncome,
        ownerPayable: sum.ownerPayable,
        outboundCount, rentDays,
        settlementBillId,
      })
    }
    return result.sort((a, b) => (b.totalRent + b.totalOutboundFee) - (a.totalRent + a.totalOutboundFee))
  },
}))
