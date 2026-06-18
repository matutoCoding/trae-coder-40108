import type { Batch, OutboundOrder, CommissionRule, CommissionRecord, DailyRent, SettlementBill, ExpiryAlertConfig } from '@/types'

const today = new Date()
const fmt = (d: Date) => d.toISOString().split('T')[0]
const addDays = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() + days); return r }

export const initialAlertConfig: ExpiryAlertConfig = {
  warningLevel1Days: 90,
  warningLevel2Days: 60,
  warningLevel3Days: 30,
}

export const initialBatches: Batch[] = [
  {
    id: 'B001', batchNo: 'BN-2026-0301', sku: 'SKU-001', skuName: '有机牛奶1L装',
    location: 'A-01-01', productionDate: fmt(addDays(today, -120)), expiryDate: fmt(addDays(today, -5)),
    shelfLifeDays: 180, quantity: 500, remainingQuantity: 320,
    status: 'expired', ownerId: 'O001', ownerName: '绿源食品', createdAt: fmt(addDays(today, -120)),
  },
  {
    id: 'B002', batchNo: 'BN-2026-0315', sku: 'SKU-001', skuName: '有机牛奶1L装',
    location: 'A-01-02', productionDate: fmt(addDays(today, -90)), expiryDate: fmt(addDays(today, 20)),
    shelfLifeDays: 180, quantity: 400, remainingQuantity: 380,
    status: 'nearExpiry', ownerId: 'O001', ownerName: '绿源食品', createdAt: fmt(addDays(today, -90)),
  },
  {
    id: 'B003', batchNo: 'BN-2026-0401', sku: 'SKU-002', skuName: '进口橄榄油500ml',
    location: 'B-02-03', productionDate: fmt(addDays(today, -180)), expiryDate: fmt(addDays(today, 45)),
    shelfLifeDays: 365, quantity: 200, remainingQuantity: 180,
    status: 'nearExpiry', ownerId: 'O002', ownerName: '海纳贸易', createdAt: fmt(addDays(today, -180)),
  },
  {
    id: 'B004', batchNo: 'BN-2026-0415', sku: 'SKU-003', skuName: '全麦面包750g',
    location: 'C-03-01', productionDate: fmt(addDays(today, -30)), expiryDate: fmt(addDays(today, 15)),
    shelfLifeDays: 90, quantity: 600, remainingQuantity: 550,
    status: 'nearExpiry', ownerId: 'O002', ownerName: '海纳贸易', createdAt: fmt(addDays(today, -30)),
  },
  {
    id: 'B005', batchNo: 'BN-2026-0501', sku: 'SKU-004', skuName: '冷冻水饺2kg',
    location: 'D-04-02', productionDate: fmt(addDays(today, -60)), expiryDate: fmt(addDays(today, 120)),
    shelfLifeDays: 365, quantity: 300, remainingQuantity: 280,
    status: 'normal', ownerId: 'O003', ownerName: '味佳食品', createdAt: fmt(addDays(today, -60)),
  },
  {
    id: 'B006', batchNo: 'BN-2026-0515', sku: 'SKU-005', skuName: '坚果礼盒1.5kg',
    location: 'A-02-01', productionDate: fmt(addDays(today, -45)), expiryDate: fmt(addDays(today, 200)),
    shelfLifeDays: 365, quantity: 150, remainingQuantity: 150,
    status: 'normal', ownerId: 'O003', ownerName: '味佳食品', createdAt: fmt(addDays(today, -45)),
  },
  {
    id: 'B007', batchNo: 'BN-2026-0601', sku: 'SKU-002', skuName: '进口橄榄油500ml',
    location: 'B-02-04', productionDate: fmt(addDays(today, -10)), expiryDate: fmt(addDays(today, 355)),
    shelfLifeDays: 365, quantity: 250, remainingQuantity: 250,
    status: 'normal', ownerId: 'O002', ownerName: '海纳贸易', createdAt: fmt(addDays(today, -10)),
  },
  {
    id: 'B008', batchNo: 'BN-2026-0605', sku: 'SKU-006', skuName: '鲜榨果汁1L',
    location: 'E-05-01', productionDate: fmt(addDays(today, -15)), expiryDate: fmt(addDays(today, 8)),
    shelfLifeDays: 60, quantity: 400, remainingQuantity: 380,
    status: 'nearExpiry', ownerId: 'O001', ownerName: '绿源食品', createdAt: fmt(addDays(today, -15)),
  },
  {
    id: 'B009', batchNo: 'BN-2026-0610', sku: 'SKU-007', skuName: '有机蜂蜜500g',
    location: 'F-06-02', productionDate: fmt(addDays(today, -30)), expiryDate: fmt(addDays(today, 700)),
    shelfLifeDays: 730, quantity: 100, remainingQuantity: 100,
    status: 'normal', ownerId: 'O003', ownerName: '味佳食品', createdAt: fmt(addDays(today, -30)),
  },
  {
    id: 'B010', batchNo: 'BN-2026-0612', sku: 'SKU-003', skuName: '全麦面包750g',
    location: 'C-03-02', productionDate: fmt(addDays(today, -2)), expiryDate: fmt(addDays(today, 88)),
    shelfLifeDays: 90, quantity: 800, remainingQuantity: 800,
    status: 'normal', ownerId: 'O002', ownerName: '海纳贸易', createdAt: fmt(addDays(today, -2)),
  },
]

export const initialOutboundOrders: OutboundOrder[] = [
  {
    id: 'OB001', orderNo: 'OUT-20260610-001', sku: 'SKU-001', skuName: '有机牛奶1L装',
    quantity: 120, batches: [
      { batchId: 'B002', batchNo: 'BN-2026-0315', quantity: 120, expiryDate: fmt(addDays(today, 20)), isFifoRecommended: true },
    ],
    status: 'completed', createdAt: fmt(addDays(today, -9)), confirmedAt: fmt(addDays(today, -9)),
    ownerId: 'O001', ownerName: '绿源食品',
  },
  {
    id: 'OB002', orderNo: 'OUT-20260612-001', sku: 'SKU-002', skuName: '进口橄榄油500ml',
    quantity: 50, batches: [
      { batchId: 'B003', batchNo: 'BN-2026-0401', quantity: 20, expiryDate: fmt(addDays(today, 45)), isFifoRecommended: true },
      { batchId: 'B007', batchNo: 'BN-2026-0601', quantity: 30, expiryDate: fmt(addDays(today, 355)), isFifoRecommended: false },
    ],
    status: 'completed', createdAt: fmt(addDays(today, -7)), confirmedAt: fmt(addDays(today, -7)),
    ownerId: 'O002', ownerName: '海纳贸易',
  },
  {
    id: 'OB003', orderNo: 'OUT-20260615-001', sku: 'SKU-004', skuName: '冷冻水饺2kg',
    quantity: 50, batches: [
      { batchId: 'B005', batchNo: 'BN-2026-0501', quantity: 50, expiryDate: fmt(addDays(today, 120)), isFifoRecommended: true },
    ],
    status: 'confirmed', createdAt: fmt(addDays(today, -4)), confirmedAt: fmt(addDays(today, -4)),
    ownerId: 'O003', ownerName: '味佳食品',
  },
  {
    id: 'OB004', orderNo: 'OUT-20260618-001', sku: 'SKU-003', skuName: '全麦面包750g',
    quantity: 100, batches: [
      { batchId: 'B004', batchNo: 'BN-2026-0415', quantity: 100, expiryDate: fmt(addDays(today, 15)), isFifoRecommended: true },
    ],
    status: 'pending', createdAt: fmt(today),
    ownerId: 'O002', ownerName: '海纳贸易',
  },
]

export const initialCommissionRules: CommissionRule[] = [
  { id: 'CR001', ownerId: 'O001', ownerName: '绿源食品', platformRate: 0.15, warehouseRate: 0.55, ownerRate: 0.30, effectiveFrom: '2026-01-01' },
  { id: 'CR002', ownerId: 'O002', ownerName: '海纳贸易', platformRate: 0.10, warehouseRate: 0.60, ownerRate: 0.30, effectiveFrom: '2026-01-01' },
  { id: 'CR003', ownerId: 'O003', ownerName: '味佳食品', platformRate: 0.12, warehouseRate: 0.58, ownerRate: 0.30, effectiveFrom: '2026-02-01' },
]

export const initialCommissionRecords: CommissionRecord[] = [
  { id: 'CR001', outboundOrderId: 'OB001', orderNo: 'OUT-20260610-001', totalFee: 600, platformShare: 90, warehouseShare: 330, ownerShare: 180, ownerId: 'O001', ownerName: '绿源食品', createdAt: fmt(addDays(today, -9)) },
  { id: 'CR002', outboundOrderId: 'OB002', orderNo: 'OUT-20260612-001', totalFee: 500, platformShare: 50, warehouseShare: 300, ownerShare: 150, ownerId: 'O002', ownerName: '海纳贸易', createdAt: fmt(addDays(today, -7)) },
  { id: 'CR003', outboundOrderId: 'OB003', orderNo: 'OUT-20260615-001', totalFee: 350, platformShare: 42, warehouseShare: 203, ownerShare: 105, ownerId: 'O003', ownerName: '味佳食品', createdAt: fmt(addDays(today, -4)) },
]

export const initialDailyRents: DailyRent[] = (() => {
  const rents: DailyRent[] = []
  const owners = [
    { ownerId: 'O001', ownerName: '绿源食品', locations: [{ location: 'A-01', area: 50, dailyRate: 2.5 }, { location: 'E-05', area: 30, dailyRate: 3.0 }] },
    { ownerId: 'O002', ownerName: '海纳贸易', locations: [{ location: 'B-02', area: 80, dailyRate: 2.8 }, { location: 'C-03', area: 60, dailyRate: 2.5 }] },
    { ownerId: 'O003', ownerName: '味佳食品', locations: [{ location: 'D-04', area: 40, dailyRate: 3.5 }, { location: 'A-02', area: 25, dailyRate: 2.5 }, { location: 'F-06', area: 20, dailyRate: 2.0 }] },
  ]
  for (let i = 17; i >= 0; i--) {
    const date = fmt(addDays(today, -i))
    owners.forEach(o => {
      o.locations.forEach(loc => {
        rents.push({
          id: `DR-${date}-${loc.location}-${o.ownerId}`,
          ownerId: o.ownerId, ownerName: o.ownerName,
          location: loc.location, area: loc.area, dailyRate: loc.dailyRate,
          date, amount: Number((loc.area * loc.dailyRate).toFixed(2)),
        })
      })
    })
  }
  return rents
})()

export const initialSettlementBills: SettlementBill[] = [
  {
    id: 'SB001', period: '2026-05', ownerId: 'O001', ownerName: '绿源食品',
    totalStorageFee: 8500, platformIncome: 1275, warehouseIncome: 4675, ownerPayable: 2550,
    status: 'settled', createdAt: '2026-06-01', confirmedAt: '2026-06-02',
    details: [
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-A-01区(50m²)', amount: 3875, platformShare: 581.25, warehouseShare: 2131.25, ownerShare: 1162.50, date: '2026-05-31' },
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-E-05区(30m²)', amount: 2790, platformShare: 418.50, warehouseShare: 1534.50, ownerShare: 837.00, date: '2026-05-31' },
      { type: 'outbound_fee', referenceId: 'OB-2026-05', description: '5月出库操作费', amount: 1835, platformShare: 275.25, warehouseShare: 1009.25, ownerShare: 550.50, date: '2026-05-31' },
    ],
  },
  {
    id: 'SB002', period: '2026-05', ownerId: 'O002', ownerName: '海纳贸易',
    totalStorageFee: 12000, platformIncome: 1200, warehouseIncome: 7200, ownerPayable: 3600,
    status: 'confirmed', createdAt: '2026-06-01', confirmedAt: '2026-06-03',
    details: [
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-B-02区(80m²)', amount: 6944, platformShare: 694.40, warehouseShare: 4166.40, ownerShare: 2083.20, date: '2026-05-31' },
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-C-03区(60m²)', amount: 4650, platformShare: 465.00, warehouseShare: 2790.00, ownerShare: 1395.00, date: '2026-05-31' },
      { type: 'outbound_fee', referenceId: 'OB-2026-05', description: '5月出库操作费', amount: 406, platformShare: 40.60, warehouseShare: 243.60, ownerShare: 121.80, date: '2026-05-31' },
    ],
  },
  {
    id: 'SB003', period: '2026-05', ownerId: 'O003', ownerName: '味佳食品',
    totalStorageFee: 7200, platformIncome: 864, warehouseIncome: 4176, ownerPayable: 2160,
    status: 'pending', createdAt: '2026-06-01',
    details: [
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-D-04区(40m²)', amount: 4340, platformShare: 520.80, warehouseShare: 2517.20, ownerShare: 1302.00, date: '2026-05-31' },
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-A-02区(25m²)', amount: 1937.50, platformShare: 232.50, warehouseShare: 1123.75, ownerShare: 581.25, date: '2026-05-31' },
      { type: 'daily_rent', referenceId: 'DR-2026-05', description: '5月仓租-F-06区(20m²)', amount: 1240, platformShare: 148.80, warehouseShare: 719.20, ownerShare: 372.00, date: '2026-05-31' },
      { type: 'outbound_fee', referenceId: 'OB-2026-05', description: '5月出库操作费', amount: 682.50, platformShare: 81.90, warehouseShare: 395.85, ownerShare: 204.75, date: '2026-05-31' },
    ],
  },
]
