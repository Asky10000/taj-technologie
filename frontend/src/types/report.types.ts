// ── Dashboard — structure réelle du backend ───────────────────────
export interface DashboardReport {
  sales: {
    monthRevenue:          number;
    monthRevenueHT:        number;
    yearRevenue:           number;
    pendingInvoicesAmount: number;
    overdueInvoicesAmount: number;
    overdueCount:          number;
  };
  crm: {
    totalCustomers:        number;
    newCustomersThisMonth: number;
    totalProspects:        number;
    activeProspects:       number;
  };
  tickets: {
    open:        number;
    inProgress:  number;
    critical:    number;
    slaBreached: number;
  };
  projects: {
    active:          number;
    overBudget:      number;
    totalBudget:     number;
    totalActualCost: number;
  };
  inventory: {
    outOfStock:      number;
    lowStock:        number;
    totalStockValue: number;
  };
  purchases: {
    pendingOrders:       number;
    pendingOrdersAmount: number;
  };
}

// ── Sales ─────────────────────────────────────────────────────────
export interface SalesReport {
  timeline:       { period: string; revenueHT: number; revenueTTC: number; count: number }[];
  byProductType:  { type: string; revenueHT: number; quantity: number }[];
  topCustomers:   { customerId: string; name: string; revenueHT: number; invoiceCount: number }[];
  topProducts:    { productId: string; sku: string; name: string; quantity: number; revenueHT: number }[];
  conversionRate: { totalQuotes: number; convertedQuotes: number; rate: number };
}

// ── Financial ─────────────────────────────────────────────────────
export interface FinancialReport {
  summary: { totalRevenue: number; totalReceived: number; totalOutstanding: number; totalOverdue: number };
  byStatus: { status: string; count: number; amount: number }[];
  agingBalance: { bracket: string; count: number; amount: number }[];
}

// ── Inventory ─────────────────────────────────────────────────────
export interface InventoryReport {
  summary: { totalProducts: number; totalValue: number; lowStockCount: number; outOfStockCount: number };
  byCategory: { category: string; products: number; value: number; quantity: number }[];
  topMovements: { productName: string; reference: string; inQty: number; outQty: number; netQty: number }[];
  stockEvolution: { date: string; value: number }[];
}

// ── Report query params ───────────────────────────────────────────
export interface ReportQuery {
  from?:    string;
  to?:      string;
  groupBy?: 'day' | 'week' | 'month';
}
