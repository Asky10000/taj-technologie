export type QuoteStatus   = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type OrderStatus   = 'CONFIRMED' | 'IN_PREPARATION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface SaleLine {
  id?:             string;
  productId?:      string;
  product?:        { id: string; sku: string; name: string };
  designation:     string;
  quantity:        number;
  unitPrice:       number;
  taxRate:         number;
  discountPercent: number;
  sortOrder?:      number;
}

export interface Quote {
  id:           string;
  code:         string;
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
  code:        string;
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
  code:          string;
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
