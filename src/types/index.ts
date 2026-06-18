export interface Batch {
  id: string
  batchNo: string
  sku: string
  skuName: string
  location: string
  productionDate: string
  expiryDate: string
  shelfLifeDays: number
  quantity: number
  remainingQuantity: number
  ownerId: string
  ownerName: string
  createdAt: string
}

export interface OutboundBatchItem {
  batchId: string
  batchNo: string
  quantity: number
  expiryDate: string
  isFifoRecommended: boolean
}

export interface OutboundOrder {
  id: string
  orderNo: string
  sku: string
  skuName: string
  quantity: number
  batches: OutboundBatchItem[]
  status: 'picking' | 'picked' | 'shipped'
  createdAt: string
  pickedAt?: string
  shippedAt?: string
  ownerId: string
  ownerName: string
  operationFee?: number
}

export interface CommissionRule {
  id: string
  ownerId: string
  ownerName: string
  platformRate: number
  warehouseRate: number
  ownerRate: number
  effectiveFrom: string
}

export interface CommissionRecord {
  id: string
  outboundOrderId: string
  orderNo: string
  totalFee: number
  platformShare: number
  warehouseShare: number
  ownerShare: number
  ownerId: string
  ownerName: string
  createdAt: string
}

export interface DailyRent {
  id: string
  ownerId: string
  ownerName: string
  location: string
  area: number
  dailyRate: number
  date: string
  amount: number
}

export interface SettlementDetail {
  type: 'outbound_fee' | 'daily_rent'
  referenceId: string
  description: string
  amount: number
  platformShare: number
  warehouseShare: number
  ownerShare: number
  date: string
}

export interface SettlementBill {
  id: string
  period: string
  ownerId: string
  ownerName: string
  totalStorageFee: number
  platformIncome: number
  warehouseIncome: number
  ownerPayable: number
  status: 'pending' | 'confirmed' | 'settled'
  createdAt: string
  confirmedAt?: string
  settledAt?: string
  exportedAt?: string
  details: SettlementDetail[]
}

export interface ExpiryAlertConfig {
  warningLevel1Days: number
  warningLevel2Days: number
  warningLevel3Days: number
}

export type BatchStatus = 'normal' | 'nearExpiry' | 'expired'

export interface FIFORecommendation {
  batchId: string
  batchNo: string
  expiryDate: string
  availableQty: number
  recommendedQty: number
  status: BatchStatus
  daysUntilExpiry: number
}

export interface AnalyticsSummary {
  period: string
  ownerId: string
  ownerName: string
  totalRent: number
  totalOutboundFee: number
  platformIncome: number
  warehouseIncome: number
  ownerPayable: number
  outboundCount: number
  rentDays: number
  settlementBillId?: string
}

export interface SettlementDiff {
  addedDetails: SettlementDetail[]
  removedDetails: SettlementDetail[]
  amountDiff: number
  platformDiff: number
  warehouseDiff: number
  ownerDiff: number
}
