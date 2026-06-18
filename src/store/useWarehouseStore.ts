import { create } from 'zustand'
import type { Batch, OutboundOrder, OutboundBatchItem, CommissionRule, CommissionRecord, DailyRent, SettlementBill, ExpiryAlertConfig, FIFORecommendation } from '@/types'
import { initialBatches, initialOutboundOrders, initialCommissionRules, initialCommissionRecords, initialDailyRents, initialSettlementBills, initialAlertConfig } from '@/data/mockData'

interface WarehouseState {
  batches: Batch[]
  outboundOrders: OutboundOrder[]
  commissionRules: CommissionRule[]
  commissionRecords: CommissionRecord[]
  dailyRents: DailyRent[]
  settlementBills: SettlementBill[]
  alertConfig: ExpiryAlertConfig

  addBatch: (batch: Omit<Batch, 'id' | 'status' | 'createdAt'>) => { ok: boolean; error?: string }
  updateBatchStatus: (id: string, status: Batch['status']) => void
  scanExpiryStatus: () => void

  createOutboundOrder: (sku: string, skuName: string, quantity: number, ownerId: string, ownerName: string) => OutboundOrder | null
  confirmOutboundOrder: (id: string) => void
  getFIFORecommendations: (sku: string, quantity: number) => FIFORecommendation[]

  addCommissionRule: (rule: Omit<CommissionRule, 'id'>) => void
  updateCommissionRule: (id: string, rule: Partial<CommissionRule>) => void

  generateSettlement: (period: string) => void
  confirmSettlement: (id: string) => void
  settleSettlement: (id: string) => void
}

const STORAGE_KEY = 'cloud-warehouse-state'

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
      settlementBills: state.settlementBills,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch { }
}

const persisted = loadState()

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
const today = () => new Date().toISOString().split('T')[0]

const computeBatchStatus = (expiryDate: string, config: ExpiryAlertConfig): Batch['status'] => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'expired'
  if (diffDays <= config.warningLevel3Days) return 'nearExpiry'
  if (diffDays <= config.warningLevel2Days) return 'nearExpiry'
  if (diffDays <= config.warningLevel1Days) return 'nearExpiry'
  return 'normal'
}

function splitFee(totalFee: number, platformRate: number, warehouseRate: number) {
  const platformShare = Math.round(totalFee * platformRate * 100) / 100
  const warehouseShare = Math.round(totalFee * warehouseRate * 100) / 100
  const ownerShare = Math.round((totalFee - platformShare - warehouseShare) * 100) / 100
  return { platformShare, warehouseShare, ownerShare }
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  batches: (persisted?.batches as Batch[]) ?? initialBatches,
  outboundOrders: (persisted?.outboundOrders as OutboundOrder[]) ?? initialOutboundOrders,
  commissionRules: (persisted?.commissionRules as CommissionRule[]) ?? initialCommissionRules,
  commissionRecords: (persisted?.commissionRecords as CommissionRecord[]) ?? initialCommissionRecords,
  dailyRents: initialDailyRents,
  settlementBills: (persisted?.settlementBills as SettlementBill[]) ?? initialSettlementBills,
  alertConfig: initialAlertConfig,

  addBatch: (batchData) => {
    const state = get()

    if (!batchData.batchNo.trim()) return { ok: false, error: '批号不能为空' }
    if (state.batches.some((b) => b.batchNo === batchData.batchNo.trim())) {
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

    const shelfLifeDays = Math.ceil(
      (expDate.getTime() - prodDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const batch: Batch = {
      ...batchData,
      batchNo: batchData.batchNo.trim(),
      quantity: qty,
      remainingQuantity: qty,
      shelfLifeDays,
      id: `B${generateId()}`,
      status: computeBatchStatus(batchData.expiryDate, state.alertConfig),
      createdAt: today(),
    }

    set((state) => {
      const next = { batches: [batch, ...state.batches] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return { ok: true }
  },

  updateBatchStatus: (id, status) => {
    set((state) => {
      const next = { batches: state.batches.map((b) => (b.id === id ? { ...b, status } : b)) }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  scanExpiryStatus: () => {
    const { alertConfig } = get()
    set((state) => {
      const next = {
        batches: state.batches.map((b) => ({
          ...b,
          status: computeBatchStatus(b.expiryDate, alertConfig),
        })),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  createOutboundOrder: (sku, skuName, quantity, ownerId, ownerName) => {
    const state = get()
    const recommendations = state.getFIFORecommendations(sku, quantity)
    const validRecs = recommendations.filter((r) => r.status !== 'expired')

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

    const order: OutboundOrder = {
      id: `OB${generateId()}`,
      orderNo: `OUT-${today().replace(/-/g, '')}-${String(state.outboundOrders.length + 1).padStart(3, '0')}`,
      sku, skuName, quantity,
      batches: batchItems,
      status: 'pending',
      createdAt: today(),
      ownerId, ownerName,
    }

    set((state) => {
      const next = { outboundOrders: [order, ...state.outboundOrders] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
    return order
  },

  confirmOutboundOrder: (id) => {
    const state = get()
    const order = state.outboundOrders.find((o) => o.id === id)
    if (!order) return

    let updatedBatches = [...state.batches]
    for (const item of order.batches) {
      updatedBatches = updatedBatches.map((b) =>
        b.id === item.batchId
          ? { ...b, remainingQuantity: Math.max(0, b.remainingQuantity - item.quantity) }
          : b
      )
    }

    const rule = state.commissionRules.find((r) => r.ownerId === order.ownerId)
    const pRate = rule?.platformRate ?? 0.1
    const wRate = rule?.warehouseRate ?? 0.6
    const totalFee = order.quantity * 5

    const { platformShare, warehouseShare, ownerShare } = splitFee(totalFee, pRate, wRate)

    const record: CommissionRecord = {
      id: `CR${generateId()}`,
      outboundOrderId: order.id,
      orderNo: order.orderNo,
      totalFee,
      platformShare,
      warehouseShare,
      ownerShare,
      ownerId: order.ownerId,
      ownerName: order.ownerName,
      createdAt: today(),
    }

    set((state) => {
      const next = {
        outboundOrders: state.outboundOrders.map((o) =>
          o.id === id ? { ...o, status: 'confirmed' as const, confirmedAt: today() } : o
        ),
        batches: updatedBatches,
        commissionRecords: [record, ...state.commissionRecords],
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  getFIFORecommendations: (sku, quantity) => {
    const { batches } = get()
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const skuBatches = batches
      .filter((b) => b.sku === sku && b.remainingQuantity > 0 && b.status !== 'expired')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    let remaining = quantity
    const recommendations: FIFORecommendation[] = []

    for (const batch of skuBatches) {
      if (remaining <= 0) break
      const daysUntilExpiry = Math.ceil(
        (new Date(batch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const take = Math.min(remaining, batch.remainingQuantity)
      recommendations.push({
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        availableQty: batch.remainingQuantity,
        recommendedQty: take,
        status: batch.status,
        daysUntilExpiry,
      })
      remaining -= take
    }

    const expiredBatches = batches
      .filter((b) => b.sku === sku && b.remainingQuantity > 0 && b.status === 'expired')
      .map((b) => ({
        batchId: b.id,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        availableQty: b.remainingQuantity,
        recommendedQty: 0,
        status: 'expired' as const,
        daysUntilExpiry: Math.ceil(
          (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))

    return [...recommendations, ...expiredBatches]
  },

  addCommissionRule: (ruleData) => {
    const rule: CommissionRule = { ...ruleData, id: `CR${generateId()}` }
    set((state) => {
      const next = { commissionRules: [...state.commissionRules, rule] }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  updateCommissionRule: (id, updates) => {
    set((state) => {
      const next = {
        commissionRules: state.commissionRules.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  generateSettlement: (period) => {
    const state = get()
    const owners = [...new Set(state.batches.map((b) => b.ownerId))]

    const newBills: SettlementBill[] = owners.map((ownerId) => {
      const owner = state.batches.find((b) => b.ownerId === ownerId)
      const ownerName = owner?.ownerName ?? ''
      const rule = state.commissionRules.find((r) => r.ownerId === ownerId)
      const pRate = rule?.platformRate ?? 0.1
      const wRate = rule?.warehouseRate ?? 0.6

      const ownerRents = state.dailyRents.filter(
        (r) => r.ownerId === ownerId && r.date.startsWith(period)
      )
      const ownerCommissions = state.commissionRecords.filter(
        (c) => c.ownerId === ownerId && c.createdAt.startsWith(period)
      )

      const details: SettlementBill['details'] = [
        ...ownerRents.map((r) => {
          const { platformShare, warehouseShare, ownerShare } = splitFee(r.amount, pRate, wRate)
          return {
            type: 'daily_rent' as const,
            referenceId: r.id,
            description: `仓租-${r.location}区(${r.area}m²)`,
            amount: r.amount,
            platformShare,
            warehouseShare,
            ownerShare,
            date: r.date,
          }
        }),
        ...ownerCommissions.map((c) => ({
          type: 'outbound_fee' as const,
          referenceId: c.id,
          description: `出库操作费-${c.orderNo}`,
          amount: c.totalFee,
          platformShare: c.platformShare,
          warehouseShare: c.warehouseShare,
          ownerShare: c.ownerShare,
          date: c.createdAt,
        })),
      ]

      const totalStorageFee = Math.round(details.reduce((s, d) => s + d.amount, 0) * 100) / 100
      const platformIncome = Math.round(details.reduce((s, d) => s + d.platformShare, 0) * 100) / 100
      const warehouseIncome = Math.round(details.reduce((s, d) => s + d.warehouseShare, 0) * 100) / 100
      const ownerPayable = Math.round((totalStorageFee - platformIncome - warehouseIncome) * 100) / 100

      return {
        id: `SB${generateId()}`,
        period,
        ownerId,
        ownerName,
        totalStorageFee,
        platformIncome,
        warehouseIncome,
        ownerPayable,
        status: 'pending' as const,
        createdAt: today(),
        details,
      }
    })

    set((state) => {
      const next = {
        settlementBills: [
          ...newBills,
          ...state.settlementBills.filter((b) => b.period !== period),
        ],
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  confirmSettlement: (id) => {
    set((state) => {
      const next = {
        settlementBills: state.settlementBills.map((b) =>
          b.id === id ? { ...b, status: 'confirmed' as const, confirmedAt: today() } : b
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },

  settleSettlement: (id) => {
    set((state) => {
      const next = {
        settlementBills: state.settlementBills.map((b) =>
          b.id === id ? { ...b, status: 'settled' as const } : b
        ),
      }
      saveState({ ...state, ...next } as WarehouseState)
      return next
    })
  },
}))
