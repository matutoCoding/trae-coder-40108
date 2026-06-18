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

  addBatch: (batch: Omit<Batch, 'id' | 'status' | 'createdAt'>) => void
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

  getNearExpiryBatches: () => Batch[]
  getExpiredBatches: () => Batch[]
  getDashboardStats: () => {
    totalBatches: number
    nearExpiryCount: number
    expiredCount: number
    monthlyFee: number
    pendingOrders: number
  }
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
const today = () => new Date().toISOString().split('T')[0]

const computeBatchStatus = (expiryDate: string, config: ExpiryAlertConfig): Batch['status'] => {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'expired'
  if (diffDays <= config.warningLevel3Days) return 'nearExpiry'
  if (diffDays <= config.warningLevel2Days) return 'nearExpiry'
  if (diffDays <= config.warningLevel1Days) return 'nearExpiry'
  return 'normal'
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  batches: initialBatches,
  outboundOrders: initialOutboundOrders,
  commissionRules: initialCommissionRules,
  commissionRecords: initialCommissionRecords,
  dailyRents: initialDailyRents,
  settlementBills: initialSettlementBills,
  alertConfig: initialAlertConfig,

  addBatch: (batchData) => {
    const batch: Batch = {
      ...batchData,
      id: `B${generateId()}`,
      status: computeBatchStatus(batchData.expiryDate, get().alertConfig),
      createdAt: today(),
    }
    set((state) => ({ batches: [batch, ...state.batches] }))
  },

  updateBatchStatus: (id, status) => {
    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? { ...b, status } : b)),
    }))
  },

  scanExpiryStatus: () => {
    const { alertConfig } = get()
    set((state) => ({
      batches: state.batches.map((b) => ({
        ...b,
        status: computeBatchStatus(b.expiryDate, alertConfig),
      })),
    }))
  },

  createOutboundOrder: (sku, skuName, quantity, ownerId, ownerName) => {
    const state = get()
    const recommendations = state.getFIFORecommendations(sku, quantity)

    const hasExpired = recommendations.some((r) => r.status === 'expired')
    if (hasExpired) return null

    const totalAvailable = recommendations.reduce((sum, r) => sum + r.availableQty, 0)
    if (totalAvailable < quantity) return null

    let remaining = quantity
    const batchItems: OutboundBatchItem[] = []

    for (const rec of recommendations) {
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

    set((state) => ({ outboundOrders: [order, ...state.outboundOrders] }))
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
    const totalFee = order.quantity * 5
    const record: CommissionRecord = {
      id: `CR${generateId()}`,
      outboundOrderId: order.id,
      orderNo: order.orderNo,
      totalFee,
      platformShare: Number((totalFee * (rule?.platformRate ?? 0.1)).toFixed(2)),
      warehouseShare: Number((totalFee * (rule?.warehouseRate ?? 0.6)).toFixed(2)),
      ownerShare: Number((totalFee * (rule?.ownerRate ?? 0.3)).toFixed(2)),
      ownerId: order.ownerId,
      ownerName: order.ownerName,
      createdAt: today(),
    }

    set((state) => ({
      outboundOrders: state.outboundOrders.map((o) =>
        o.id === id ? { ...o, status: 'confirmed' as const, confirmedAt: today() } : o
      ),
      batches: updatedBatches,
      commissionRecords: [record, ...state.commissionRecords],
    }))
  },

  getFIFORecommendations: (sku, quantity) => {
    const { batches } = get()
    const skuBatches = batches
      .filter((b) => b.sku === sku && b.remainingQuantity > 0 && b.status !== 'expired')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    const now = new Date()
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
    set((state) => ({ commissionRules: [...state.commissionRules, rule] }))
  },

  updateCommissionRule: (id, updates) => {
    set((state) => ({
      commissionRules: state.commissionRules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }))
  },

  generateSettlement: (period) => {
    const state = get()
    const owners = [...new Set(state.batches.map((b) => b.ownerId))]

    const newBills: SettlementBill[] = owners.map((ownerId) => {
      const owner = state.batches.find((b) => b.ownerId === ownerId)
      const ownerName = owner?.ownerName ?? ''
      const rule = state.commissionRules.find((r) => r.ownerId === ownerId)

      const ownerRents = state.dailyRents.filter(
        (r) => r.ownerId === ownerId && r.date.startsWith(period)
      )
      const ownerCommissions = state.commissionRecords.filter(
        (c) => c.ownerId === ownerId && c.createdAt.startsWith(period)
      )

      const totalRent = ownerRents.reduce((s, r) => s + r.amount, 0)
      const totalCommission = ownerCommissions.reduce((s, c) => s + c.totalFee, 0)
      const totalStorageFee = Number((totalRent + totalCommission).toFixed(2))

      const pRate = rule?.platformRate ?? 0.1
      const wRate = rule?.warehouseRate ?? 0.6

      const details = [
        ...ownerRents.map((r) => ({
          type: 'daily_rent' as const,
          referenceId: r.id,
          description: `${period}仓租-${r.location}区(${r.area}m²)`,
          amount: r.amount,
          platformShare: Number((r.amount * pRate).toFixed(2)),
          warehouseShare: Number((r.amount * wRate).toFixed(2)),
          ownerShare: Number((r.amount * (1 - pRate - wRate)).toFixed(2)),
          date: r.date,
        })),
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

      return {
        id: `SB${generateId()}`,
        period,
        ownerId,
        ownerName,
        totalStorageFee,
        platformIncome: Number((totalStorageFee * pRate).toFixed(2)),
        warehouseIncome: Number((totalStorageFee * wRate).toFixed(2)),
        ownerPayable: Number((totalStorageFee * (1 - pRate - wRate)).toFixed(2)),
        status: 'pending' as const,
        createdAt: today(),
        details,
      }
    })

    set((state) => ({
      settlementBills: [
        ...newBills,
        ...state.settlementBills.filter((b) => b.period !== period),
      ],
    }))
  },

  confirmSettlement: (id) => {
    set((state) => ({
      settlementBills: state.settlementBills.map((b) =>
        b.id === id ? { ...b, status: 'confirmed' as const, confirmedAt: today() } : b
      ),
    }))
  },

  settleSettlement: (id) => {
    set((state) => ({
      settlementBills: state.settlementBills.map((b) =>
        b.id === id ? { ...b, status: 'settled' as const } : b
      ),
    }))
  },

  getNearExpiryBatches: () => {
    return get().batches.filter((b) => b.status === 'nearExpiry')
  },

  getExpiredBatches: () => {
    return get().batches.filter((b) => b.status === 'expired')
  },

  getDashboardStats: () => {
    const state = get()
    const currentMonth = today().substring(0, 7)
    const monthRents = state.dailyRents.filter((r) => r.date.startsWith(currentMonth))
    const monthCommissions = state.commissionRecords.filter((c) => c.createdAt.startsWith(currentMonth))
    const monthlyFee = monthRents.reduce((s, r) => s + r.amount, 0) + monthCommissions.reduce((s, c) => s + c.totalFee, 0)

    return {
      totalBatches: state.batches.filter((b) => b.remainingQuantity > 0).length,
      nearExpiryCount: state.batches.filter((b) => b.status === 'nearExpiry' && b.remainingQuantity > 0).length,
      expiredCount: state.batches.filter((b) => b.status === 'expired' && b.remainingQuantity > 0).length,
      monthlyFee: Number(monthlyFee.toFixed(2)),
      pendingOrders: state.outboundOrders.filter((o) => o.status === 'pending').length,
    }
  },
}))
