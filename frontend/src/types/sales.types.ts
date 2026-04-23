export type QuoteStatus   = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type OrderStatus   = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'INVOICED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface SaleLine {
  id?:            string;
  productId?:     string;
  product?:       { id: string; sku: string; name: string };
  description:    string;
  quantity:       number;
  unitPrice:      number;
  taxRate:        number;
  discountType?:  'PERCENT' | 'FIXED';
  discountValue?: number;
  sortOrder?:     number;
}

export interface Quote {
  id:           string;
  number:       string;
  status:       QuoteStatus;
  customerId:   string;
  customer?:    { id: string; companyName: string; code: string };
  validUntil?:  string;
  notes?:       string;
  globalDiscount: number;
  lines:        SaleLine[];
  totalHT:      number;
  totalTVA:     number;
  totalTTC:     number;
  createdAt:    string;
  updatedAt:    string;
}

export interface Order {
  id:          string;
  number:      string;
  status:      OrderStatus;
  customerId:  string;
  customer?:   { id: string; companyName: string; code: string };
  quoteId?:    string;
  deliveredAt?: string;
  notes?:      string;
  lines:       SaleLine[];
  totalHT:     number;
  totalTVA:    number;
  totalTTC:    number;
  createdAt:   string;
}

export interface Invoice {
  id:            string;
  number:        string;
  status:        InvoiceStatus;
  customerId:    string;
  customer?:     { id: string; companyName: string; code: string };
  orderId?:      string;
  dueDate?:      string;
  paidAmount:    number;
  notes?:        string;
  paymentMethod?: string;
  lines:         SaleLine[];
  totalHT:       number;
  totalTVA:      number;
  totalTTC:      number;
  remainingAmount: number;
  createdAt:     string;
}
