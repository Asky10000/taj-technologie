export enum SupplierStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED  = 'BLOCKED',
}

export enum PurchaseOrderStatus {
  DRAFT               = 'DRAFT',
  SENT                = 'SENT',
  CONFIRMED           = 'CONFIRMED',
  PARTIALLY_RECEIVED  = 'PARTIALLY_RECEIVED',
  RECEIVED            = 'RECEIVED',
  CANCELLED           = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID           = 'UNPAID',
  PARTIALLY_PAID   = 'PARTIALLY_PAID',
  PAID             = 'PAID',
}
