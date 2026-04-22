// ── Dashboard ─────────────────────────────────────────────────────
export interface DashboardReport {
  revenue:         { total: number; thisMonth: number; lastMonth: number; growth: number };
  quotes:          { total: number; pending: number; accepted: number; conversionRate: number };
  orders:          { total: number; active: number; delivered: number };
  invoices:        { total: number; overdue: number; overdueAmount: number };
  customers:       { total: number; newThisMonth: number };
  prospects:       { total: number; byStage: Record<string, number> };
  tickets:         { total: number; open: number; slaBreached: number };
  projects:        { total: number; active: number; overBudget: number };
  inventory:       { totalValue: number; lowStockCount: number };
  purchases:       { totalThisMonth: number; pendingOrders: number };
  timeline:        { month: string; revenue: number; purchases: number }[];
}

// ── Sales ─────────────────────────────────────────────────────────
export interface SalesReport {
  summary: { totalQuotes: number; totalOrders: number; totalInvoices: number; totalRevenue: number; conversionRate: number };
  timeline: { period: string; quotes: number; orders: number; revenue: number }[];
  byProductType: { type: string; count: number; revenue: number }[];
  topCustomers: { id: string; name: string; revenue: number; orders: number }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
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
  from?: string;
  to?: string;
  groupBy?: 'day' | 'week' | 'month';
}
