export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  paymentTerms?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id?: string;
  productId?: string;
  product?: { name: string; reference: string };
  designation: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplier?: Supplier;
  supplierId: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  paidAmount: number;
  remainingAmount: number;
  expectedDeliveryDate?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
