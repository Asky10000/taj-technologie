export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  taxId?: string;
  paymentTermsDays: number;
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
  sourceOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Approvisionnement : commande client → bons de commande ─────── */

export interface ProvisionOrderLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  productId?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
  };
}

export interface ProvisionOrder {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  totalTTC: number;
  customer?: { id: string; name?: string };
  lines?: ProvisionOrderLine[];
  purchaseOrderCount?: number;
}

export interface OrderProvisioningDetail {
  order: ProvisionOrder;
  purchaseOrders: PurchaseOrder[];
}

export interface ProvisionAssignment {
  lineId: string;
  supplierId: string;
  unitPrice?: number;
  quantity?: number;
}
