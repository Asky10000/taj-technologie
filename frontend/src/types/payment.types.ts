export type PaymentMethod =
  | 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CARD' | 'MOBILE_MONEY' | 'OTHER';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH:          'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK:         'Chèque',
  CARD:          'Carte',
  MOBILE_MONEY:  'Mobile Money',
  OTHER:         'Autre',
};

export interface Payment {
  id:              string;
  amount:          number;
  paymentMethod?:  PaymentMethod;
  reference?:      string;
  paidAt:          string;
  proofUrl?:       string;
  invoiceId?:      string;
  purchaseOrderId?: string;
  createdBy?:      { id: string; firstName: string; lastName: string };
  createdAt:       string;
}
