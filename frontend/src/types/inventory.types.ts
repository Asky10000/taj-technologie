export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE';

export interface Stock {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    reference: string;
    category?: { name: string };
    unit?: string;
  };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minQuantity: number;
  reorderQuantity: number;
  maxQuantity: number;
  avgCostPrice: number;
  totalValue: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  stockId: string;
  stock?: {
    product?: { name: string; reference: string };
  };
  type: MovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  quantityBefore: number;
  quantityAfter: number;
  reference?: string;
  notes?: string;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}
