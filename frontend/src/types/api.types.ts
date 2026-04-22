// ── Réponses génériques ─────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiError {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

// ── Auth ────────────────────────────────────────────────────────

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'SALES'
  | 'TECHNICIAN'
  | 'USER';

export interface AuthUser {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

// ── Dashboard KPIs ──────────────────────────────────────────────

export interface DashboardData {
  sales: {
    monthRevenue: number;
    monthRevenueHT: number;
    yearRevenue: number;
    pendingInvoicesAmount: number;
    overdueInvoicesAmount: number;
    overdueCount: number;
  };
  crm: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    totalProspects: number;
    activeProspects: number;
  };
  tickets: {
    open: number;
    inProgress: number;
    critical: number;
    slaBreached: number;
  };
  projects: {
    active: number;
    overBudget: number;
    totalBudget: number;
    totalActualCost: number;
  };
  inventory: {
    outOfStock: number;
    lowStock: number;
    totalStockValue: number;
  };
  purchases: {
    pendingOrders: number;
    pendingOrdersAmount: number;
  };
}

// ── Sales report ────────────────────────────────────────────────

export interface SalesReportData {
  timeline: { period: string; revenueHT: number; revenueTTC: number; count: number }[];
  byProductType: { type: string; revenueHT: number; quantity: number }[];
  topCustomers: { customerId: string; name: string; revenueHT: number; invoiceCount: number }[];
  topProducts: { productId: string; sku: string; name: string; quantity: number; revenueHT: number }[];
  conversionRate: { totalQuotes: number; convertedQuotes: number; rate: number };
}
