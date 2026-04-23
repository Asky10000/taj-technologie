import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DateRangeDto, ReportGroupBy } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private dateFilter(
    alias: string,
    column: string,
    from?: string,
    to?: string,
  ): { clause: string; params: Record<string, string> } {
    const clauses: string[] = [];
    const params: Record<string, string> = {};
    if (from) {
      clauses.push(`${alias}.${column} >= :from`);
      params.from = from;
    }
    if (to) {
      clauses.push(`${alias}.${column} <= :to`);
      params.to = `${to}T23:59:59.999Z`;
    }
    return {
      clause: clauses.length ? clauses.join(' AND ') : '1=1',
      params,
    };
  }

  private groupByTrunc(groupBy: ReportGroupBy = ReportGroupBy.MONTH): string {
    const map: Record<ReportGroupBy, string> = {
      [ReportGroupBy.DAY]:   'day',
      [ReportGroupBy.WEEK]:  'week',
      [ReportGroupBy.MONTH]: 'month',
    };
    return map[groupBy];
  }

  // ─────────────────────────────────────────────────────────────
  // 1. DASHBOARD GLOBAL — KPIs
  // ─────────────────────────────────────────────────────────────

  async getDashboard(): Promise<{
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
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const [
      monthRevRow,
      yearRevRow,
      pendingInvRow,
      overdueInvRow,
      customersRow,
      newCustomersRow,
      prospectsRow,
      ticketsRow,
      projectsRow,
      stockRow,
      purchasesRow,
    ] = await Promise.all([
      // CA du mois (TTC)
      this.dataSource.query<{ total: string }[]>(`
        SELECT COALESCE(SUM(i.total_ttc), 0) AS total
        FROM invoices i
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          AND i.created_at >= $1
      `, [monthStart]),

      // CA de l'année
      this.dataSource.query<{ total: string; total_ht: string }[]>(`
        SELECT
          COALESCE(SUM(i.total_ttc), 0) AS total,
          COALESCE(SUM(i.total_ht),  0) AS total_ht
        FROM invoices i
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          AND i.created_at >= $1
      `, [yearStart]),

      // Factures en attente de paiement
      this.dataSource.query<{ count: string; amount: string }[]>(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(total_ttc - paid_amount), 0) AS amount
        FROM invoices
        WHERE deleted_at IS NULL
          AND status IN ('SENT','PARTIALLY_PAID')
      `),

      // Factures en retard
      this.dataSource.query<{ count: string; amount: string }[]>(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(total_ttc - paid_amount), 0) AS amount
        FROM invoices
        WHERE deleted_at IS NULL AND status = 'OVERDUE'
      `),

      // Clients totaux
      this.dataSource.query<{ count: string }[]>(`
        SELECT COUNT(*) AS count FROM customers WHERE deleted_at IS NULL
      `),

      // Nouveaux clients ce mois
      this.dataSource.query<{ count: string }[]>(`
        SELECT COUNT(*) AS count FROM customers
        WHERE deleted_at IS NULL AND created_at >= $1
      `, [monthStart]),

      // Prospects
      this.dataSource.query<{ total: string; active: string }[]>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status NOT IN ('WON','LOST')) AS active
        FROM prospects WHERE deleted_at IS NULL
      `),

      // Tickets ouverts / critiques / SLA breach
      this.dataSource.query<{ open: string; in_progress: string; critical: string; sla_breached: string }[]>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'OPEN')        AS open,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
          COUNT(*) FILTER (WHERE priority = 'CRITICAL' AND status NOT IN ('RESOLVED','CLOSED')) AS critical,
          COUNT(*) FILTER (
            WHERE status NOT IN ('RESOLVED','CLOSED')
              AND sla_resolution_due_at < NOW()
          ) AS sla_breached
        FROM tickets WHERE deleted_at IS NULL
      `),

      // Projets actifs / dépassement budget
      this.dataSource.query<{ active: string; over_budget: string; total_budget: string; total_cost: string }[]>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS' AND actual_cost > budget AND budget > 0) AS over_budget,
          COALESCE(SUM(budget), 0)      AS total_budget,
          COALESCE(SUM(actual_cost), 0) AS total_cost
        FROM projects WHERE deleted_at IS NULL
      `),

      // Stock alertes + valeur
      this.dataSource.query<{ out_of_stock: string; low_stock: string; total_value: string }[]>(`
        SELECT
          COUNT(*) FILTER (WHERE quantity <= 0)                        AS out_of_stock,
          COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= min_quantity AND min_quantity > 0) AS low_stock,
          COALESCE(SUM(quantity * avg_cost_price), 0)                  AS total_value
        FROM stocks WHERE deleted_at IS NULL
      `),

      // Commandes fournisseurs en attente
      this.dataSource.query<{ count: string }[]>(`
        SELECT COUNT(*) AS count
        FROM purchase_orders
        WHERE deleted_at IS NULL
          AND status IN ('SENT','CONFIRMED','PARTIALLY_RECEIVED')
      `),
    ]);

    const monthRevenueHT = parseFloat(yearRevRow[0]?.total_ht ?? '0');
    const monthRevenue   = parseFloat(monthRevRow[0]?.total ?? '0');

    // Calculer le montant des commandes fournisseurs en attente
    const pendingPOAmount = await this.dataSource.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100)), 0)
         FROM purchase_order_lines l WHERE l.purchase_order_id = po.id)
        + po.shipping_cost
      ), 0) AS amount
      FROM purchase_orders po
      WHERE po.deleted_at IS NULL
        AND po.status IN ('SENT','CONFIRMED','PARTIALLY_RECEIVED')
    `);

    return {
      sales: {
        monthRevenue,
        monthRevenueHT: parseFloat(yearRevRow[0]?.total_ht ?? '0') || monthRevenueHT,
        yearRevenue:    parseFloat(yearRevRow[0]?.total ?? '0'),
        pendingInvoicesAmount: parseFloat(pendingInvRow[0]?.amount ?? '0'),
        overdueInvoicesAmount: parseFloat(overdueInvRow[0]?.amount ?? '0'),
        overdueCount:          parseInt(overdueInvRow[0]?.count ?? '0', 10),
      },
      crm: {
        totalCustomers:       parseInt(customersRow[0]?.count ?? '0', 10),
        newCustomersThisMonth: parseInt(newCustomersRow[0]?.count ?? '0', 10),
        totalProspects:       parseInt(prospectsRow[0]?.total ?? '0', 10),
        activeProspects:      parseInt(prospectsRow[0]?.active ?? '0', 10),
      },
      tickets: {
        open:       parseInt(ticketsRow[0]?.open ?? '0', 10),
        inProgress: parseInt(ticketsRow[0]?.in_progress ?? '0', 10),
        critical:   parseInt(ticketsRow[0]?.critical ?? '0', 10),
        slaBreached: parseInt(ticketsRow[0]?.sla_breached ?? '0', 10),
      },
      projects: {
        active:        parseInt(projectsRow[0]?.active ?? '0', 10),
        overBudget:    parseInt(projectsRow[0]?.over_budget ?? '0', 10),
        totalBudget:   parseFloat(projectsRow[0]?.total_budget ?? '0'),
        totalActualCost: parseFloat(projectsRow[0]?.total_cost ?? '0'),
      },
      inventory: {
        outOfStock:     parseInt(stockRow[0]?.out_of_stock ?? '0', 10),
        lowStock:       parseInt(stockRow[0]?.low_stock ?? '0', 10),
        totalStockValue: parseFloat(stockRow[0]?.total_value ?? '0'),
      },
      purchases: {
        pendingOrders:       parseInt(purchasesRow[0]?.count ?? '0', 10),
        pendingOrdersAmount: parseFloat(pendingPOAmount[0]?.amount ?? '0'),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RAPPORT VENTES
  // ─────────────────────────────────────────────────────────────

  async getSalesReport(query: DateRangeDto): Promise<{
    timeline: { period: string; revenueHT: number; revenueTTC: number; count: number }[];
    byProductType: { type: string; revenueHT: number; quantity: number }[];
    topCustomers: { customerId: string; name: string; revenueHT: number; invoiceCount: number }[];
    topProducts: { productId: string; sku: string; name: string; quantity: number; revenueHT: number }[];
    conversionRate: { totalQuotes: number; convertedQuotes: number; rate: number };
  }> {
    const { from, to } = query;
    const trunc = this.groupByTrunc(query.groupBy);
    const limit = query.limit ?? 10;

    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (from) parts.push(`${alias}.created_at >= '${from}'`);
      if (to)   parts.push(`${alias}.created_at <= '${to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };

    const [timeline, byType, topCustomers, topProducts, conversionRaw] = await Promise.all([
      // Évolution CA dans le temps
      this.dataSource.query<{ period: string; ht: string; ttc: string; cnt: string }[]>(`
        SELECT
          DATE_TRUNC('${trunc}', i.created_at)::date::text AS period,
          COALESCE(SUM(CASE WHEN l.discount_type = 'PERCENT' THEN l.quantity * l.unit_price * (1 - l.discount_value/100) ELSE l.quantity * l.unit_price - l.discount_value END), 0) AS ht,
          COALESCE(SUM(CASE WHEN l.discount_type = 'PERCENT' THEN l.quantity * l.unit_price * (1 - l.discount_value/100) * (1 + l.tax_rate/100) ELSE (l.quantity * l.unit_price - l.discount_value) * (1 + l.tax_rate/100) END), 0) AS ttc,
          COUNT(DISTINCT i.id) AS cnt
        FROM invoices i
        JOIN sale_lines l ON l.invoice_id = i.id
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          ${dateClause('i')}
        GROUP BY 1
        ORDER BY 1
      `),

      // Répartition par type de produit
      this.dataSource.query<{ type: string; ht: string; qty: string }[]>(`
        SELECT
          p.type,
          COALESCE(SUM(CASE WHEN l.discount_type = 'PERCENT' THEN l.quantity * l.unit_price * (1 - l.discount_value/100) ELSE l.quantity * l.unit_price - l.discount_value END), 0) AS ht,
          COALESCE(SUM(l.quantity), 0) AS qty
        FROM invoices i
        JOIN sale_lines l ON l.invoice_id = i.id
        LEFT JOIN products p ON p.id = l.product_id
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          ${dateClause('i')}
        GROUP BY p.type
        ORDER BY ht DESC
      `),

      // Top clients
      this.dataSource.query<{ customer_id: string; name: string; ht: string; cnt: string }[]>(`
        SELECT
          c.id AS customer_id,
          c.company_name AS name,
          COALESCE(SUM(CASE WHEN l.discount_type = 'PERCENT' THEN l.quantity * l.unit_price * (1 - l.discount_value/100) ELSE l.quantity * l.unit_price - l.discount_value END), 0) AS ht,
          COUNT(DISTINCT i.id) AS cnt
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        JOIN sale_lines l ON l.invoice_id = i.id
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          ${dateClause('i')}
        GROUP BY c.id, c.company_name
        ORDER BY ht DESC
        LIMIT ${limit}
      `),

      // Top produits
      this.dataSource.query<{ product_id: string; sku: string; name: string; qty: string; ht: string }[]>(`
        SELECT
          p.id AS product_id,
          p.sku,
          p.name,
          COALESCE(SUM(l.quantity), 0) AS qty,
          COALESCE(SUM(CASE WHEN l.discount_type = 'PERCENT' THEN l.quantity * l.unit_price * (1 - l.discount_value/100) ELSE l.quantity * l.unit_price - l.discount_value END), 0) AS ht
        FROM invoices i
        JOIN sale_lines l ON l.invoice_id = i.id
        JOIN products p ON p.id = l.product_id
        WHERE i.deleted_at IS NULL
          AND i.status IN ('PAID','PARTIALLY_PAID','OVERDUE')
          ${dateClause('i')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY ht DESC
        LIMIT ${limit}
      `),

      // Taux de conversion devis → commande
      this.dataSource.query<{ total: string; converted: string }[]>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('ACCEPTED','CONVERTED')) AS converted
        FROM quotes
        WHERE deleted_at IS NULL
          ${dateClause('quotes')}
      `),
    ]);

    const totalQuotes     = parseInt(conversionRaw[0]?.total ?? '0', 10);
    const convertedQuotes = parseInt(conversionRaw[0]?.converted ?? '0', 10);

    return {
      timeline: timeline.map((r) => ({
        period:     r.period,
        revenueHT:  parseFloat(r.ht),
        revenueTTC: parseFloat(r.ttc),
        count:      parseInt(r.cnt, 10),
      })),
      byProductType: byType.map((r) => ({
        type:      r.type ?? 'UNKNOWN',
        revenueHT: parseFloat(r.ht),
        quantity:  parseFloat(r.qty),
      })),
      topCustomers: topCustomers.map((r) => ({
        customerId:   r.customer_id,
        name:         r.name,
        revenueHT:    parseFloat(r.ht),
        invoiceCount: parseInt(r.cnt, 10),
      })),
      topProducts: topProducts.map((r) => ({
        productId: r.product_id,
        sku:       r.sku,
        name:      r.name,
        quantity:  parseFloat(r.qty),
        revenueHT: parseFloat(r.ht),
      })),
      conversionRate: {
        totalQuotes,
        convertedQuotes,
        rate: totalQuotes > 0 ? Math.round((convertedQuotes / totalQuotes) * 1000) / 10 : 0,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. RAPPORT FINANCIER — FACTURES
  // ─────────────────────────────────────────────────────────────

  async getFinancialReport(query: DateRangeDto): Promise<{
    summary: {
      totalEmitted: number;
      totalPaid: number;
      totalUnpaid: number;
      totalOverdue: number;
      recoveryRate: number;
      avgPaymentDays: number;
    };
    byStatus: { status: string; count: number; amount: number }[];
    agingBalance: {
      current: number;
      days30: number;
      days60: number;
      days90: number;
      over90: number;
    };
  }> {
    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (query.from) parts.push(`${alias}.created_at >= '${query.from}'`);
      if (query.to)   parts.push(`${alias}.created_at <= '${query.to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };

    const [summary, byStatus, aging] = await Promise.all([
      this.dataSource.query<{
        emitted: string; paid: string; unpaid: string; overdue: string; avg_days: string;
      }[]>(`
        SELECT
          COALESCE(SUM(total_ttc), 0) AS emitted,
          COALESCE(SUM(paid_amount), 0) AS paid,
          COALESCE(SUM(CASE WHEN status NOT IN ('PAID','CANCELLED') THEN total_ttc - paid_amount ELSE 0 END), 0) AS unpaid,
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN total_ttc - paid_amount ELSE 0 END), 0) AS overdue,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
            FILTER (WHERE status = 'PAID') AS avg_days
        FROM invoices
        WHERE deleted_at IS NULL ${dateClause('invoices')}
      `),

      this.dataSource.query<{ status: string; cnt: string; amount: string }[]>(`
        SELECT status,
               COUNT(*) AS cnt,
               COALESCE(SUM(total_ttc), 0) AS amount
        FROM invoices
        WHERE deleted_at IS NULL ${dateClause('invoices')}
        GROUP BY status
        ORDER BY amount DESC
      `),

      // Balance âgée des créances
      this.dataSource.query<{
        current: string; d30: string; d60: string; d90: string; over90: string;
      }[]>(`
        SELECT
          COALESCE(SUM(CASE WHEN due_date >= NOW() THEN total_ttc - paid_amount ELSE 0 END), 0) AS current,
          COALESCE(SUM(CASE WHEN due_date < NOW() AND due_date >= NOW() - INTERVAL '30 days'
                       THEN total_ttc - paid_amount ELSE 0 END), 0) AS d30,
          COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '30 days' AND due_date >= NOW() - INTERVAL '60 days'
                       THEN total_ttc - paid_amount ELSE 0 END), 0) AS d60,
          COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '60 days' AND due_date >= NOW() - INTERVAL '90 days'
                       THEN total_ttc - paid_amount ELSE 0 END), 0) AS d90,
          COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '90 days'
                       THEN total_ttc - paid_amount ELSE 0 END), 0) AS over90
        FROM invoices
        WHERE deleted_at IS NULL
          AND status NOT IN ('PAID','CANCELLED')
          AND due_date IS NOT NULL
      `),
    ]);

    const emitted = parseFloat(summary[0]?.emitted ?? '0');
    const paid    = parseFloat(summary[0]?.paid ?? '0');

    return {
      summary: {
        totalEmitted:   emitted,
        totalPaid:      paid,
        totalUnpaid:    parseFloat(summary[0]?.unpaid ?? '0'),
        totalOverdue:   parseFloat(summary[0]?.overdue ?? '0'),
        recoveryRate:   emitted > 0 ? Math.round((paid / emitted) * 1000) / 10 : 0,
        avgPaymentDays: Math.round(parseFloat(summary[0]?.avg_days ?? '0')),
      },
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count:  parseInt(r.cnt, 10),
        amount: parseFloat(r.amount),
      })),
      agingBalance: {
        current: parseFloat(aging[0]?.current ?? '0'),
        days30:  parseFloat(aging[0]?.d30 ?? '0'),
        days60:  parseFloat(aging[0]?.d60 ?? '0'),
        days90:  parseFloat(aging[0]?.d90 ?? '0'),
        over90:  parseFloat(aging[0]?.over90 ?? '0'),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. RAPPORT INVENTAIRE
  // ─────────────────────────────────────────────────────────────

  async getInventoryReport(query: DateRangeDto): Promise<{
    summary: {
      totalProducts: number;
      totalStockValue: number;
      outOfStock: number;
      lowStock: number;
      avgRotation: number;
    };
    byCategory: { categoryId: string; name: string; stockValue: number; productCount: number }[];
    topMovements: { productId: string; sku: string; name: string; totalIn: number; totalOut: number }[];
    stockEvolution: { period: string; totalIn: number; totalOut: number }[];
  }> {
    const trunc = this.groupByTrunc(query.groupBy);
    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (query.from) parts.push(`${alias}.created_at >= '${query.from}'`);
      if (query.to)   parts.push(`${alias}.created_at <= '${query.to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };
    const limit = query.limit ?? 10;

    const [summary, byCategory, topMovements, evolution] = await Promise.all([
      this.dataSource.query<{
        total: string; value: string; out_stock: string; low_stock: string;
      }[]>(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(s.quantity * s.avg_cost_price), 0) AS value,
          COUNT(*) FILTER (WHERE s.quantity <= 0) AS out_stock,
          COUNT(*) FILTER (WHERE s.quantity > 0 AND s.min_quantity > 0 AND s.quantity <= s.min_quantity) AS low_stock
        FROM stocks s
        WHERE s.deleted_at IS NULL
      `),

      this.dataSource.query<{ cat_id: string; cat_name: string; value: string; cnt: string }[]>(`
        SELECT
          cat.id AS cat_id,
          cat.name AS cat_name,
          COALESCE(SUM(s.quantity * s.avg_cost_price), 0) AS value,
          COUNT(DISTINCT p.id) AS cnt
        FROM stocks s
        JOIN products p ON p.id = s.product_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE s.deleted_at IS NULL
        GROUP BY cat.id, cat.name
        ORDER BY value DESC
      `),

      this.dataSource.query<{ product_id: string; sku: string; name: string; total_in: string; total_out: string }[]>(`
        SELECT
          p.id AS product_id,
          p.sku,
          p.name,
          COALESCE(SUM(m.quantity) FILTER (WHERE m.type IN ('IN','INITIAL','RETURN')), 0) AS total_in,
          COALESCE(SUM(m.quantity) FILTER (WHERE m.type IN ('OUT','LOSS')), 0) AS total_out
        FROM stock_movements m
        JOIN stocks s ON s.id = m.stock_id
        JOIN products p ON p.id = s.product_id
        WHERE m.deleted_at IS NULL ${dateClause('m')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY (total_in + total_out) DESC
        LIMIT ${limit}
      `),

      this.dataSource.query<{ period: string; total_in: string; total_out: string }[]>(`
        SELECT
          DATE_TRUNC('${trunc}', m.created_at)::date::text AS period,
          COALESCE(SUM(m.quantity) FILTER (WHERE m.type IN ('IN','INITIAL','RETURN')), 0) AS total_in,
          COALESCE(SUM(m.quantity) FILTER (WHERE m.type IN ('OUT','LOSS')), 0) AS total_out
        FROM stock_movements m
        WHERE m.deleted_at IS NULL ${dateClause('m')}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    return {
      summary: {
        totalProducts:   parseInt(summary[0]?.total ?? '0', 10),
        totalStockValue: parseFloat(summary[0]?.value ?? '0'),
        outOfStock:      parseInt(summary[0]?.out_stock ?? '0', 10),
        lowStock:        parseInt(summary[0]?.low_stock ?? '0', 10),
        avgRotation:     0, // calcul complexe, laissé pour v2
      },
      byCategory: byCategory.map((r) => ({
        categoryId:   r.cat_id,
        name:         r.cat_name ?? 'Sans catégorie',
        stockValue:   parseFloat(r.value),
        productCount: parseInt(r.cnt, 10),
      })),
      topMovements: topMovements.map((r) => ({
        productId: r.product_id,
        sku:       r.sku,
        name:      r.name,
        totalIn:   parseFloat(r.total_in),
        totalOut:  parseFloat(r.total_out),
      })),
      stockEvolution: evolution.map((r) => ({
        period:   r.period,
        totalIn:  parseFloat(r.total_in),
        totalOut: parseFloat(r.total_out),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. RAPPORT PROJETS
  // ─────────────────────────────────────────────────────────────

  async getProjectsReport(query: DateRangeDto): Promise<{
    summary: {
      total: number;
      active: number;
      completed: number;
      totalBudget: number;
      totalActualCost: number;
      budgetVariance: number;
      overBudgetCount: number;
    };
    byStatus: { status: string; count: number; totalBudget: number }[];
    topByHours: { projectId: string; code: string; name: string; totalHours: number; billableHours: number; cost: number }[];
    teamProductivity: { userId: string; name: string; totalHours: number; billableHours: number; totalCost: number }[];
  }> {
    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (query.from) parts.push(`${alias}.created_at >= '${query.from}'`);
      if (query.to)   parts.push(`${alias}.created_at <= '${query.to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };
    const limit = query.limit ?? 10;

    const [summary, byStatus, topProjects, productivity] = await Promise.all([
      this.dataSource.query<{
        total: string; active: string; completed: string;
        budget: string; cost: string; over_budget: string;
      }[]>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COALESCE(SUM(budget), 0) AS budget,
          COALESCE(SUM(actual_cost), 0) AS cost,
          COUNT(*) FILTER (WHERE actual_cost > budget AND budget > 0) AS over_budget
        FROM projects
        WHERE deleted_at IS NULL ${dateClause('projects')}
      `),

      this.dataSource.query<{ status: string; cnt: string; budget: string }[]>(`
        SELECT status, COUNT(*) AS cnt, COALESCE(SUM(budget), 0) AS budget
        FROM projects WHERE deleted_at IS NULL ${dateClause('projects')}
        GROUP BY status ORDER BY cnt DESC
      `),

      this.dataSource.query<{
        project_id: string; code: string; name: string;
        hours: string; billable: string; cost: string;
      }[]>(`
        SELECT
          p.id AS project_id, p.code, p.name,
          COALESCE(SUM(e.hours), 0) AS hours,
          COALESCE(SUM(e.hours) FILTER (WHERE e.is_billable), 0) AS billable,
          COALESCE(SUM(e.hours * e.hourly_rate), 0) AS cost
        FROM projects p
        LEFT JOIN time_entries e ON e.project_id = p.id
        WHERE p.deleted_at IS NULL ${dateClause('p')}
        GROUP BY p.id, p.code, p.name
        ORDER BY hours DESC
        LIMIT ${limit}
      `),

      this.dataSource.query<{
        user_id: string; first_name: string; last_name: string;
        hours: string; billable: string; cost: string;
      }[]>(`
        SELECT
          u.id AS user_id, u.first_name, u.last_name,
          COALESCE(SUM(e.hours), 0) AS hours,
          COALESCE(SUM(e.hours) FILTER (WHERE e.is_billable), 0) AS billable,
          COALESCE(SUM(e.hours * e.hourly_rate), 0) AS cost
        FROM time_entries e
        JOIN users u ON u.id = e.user_id
        WHERE e.deleted_at IS NULL ${dateClause('e')}
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY hours DESC
        LIMIT ${limit}
      `),
    ]);

    const totalBudget = parseFloat(summary[0]?.budget ?? '0');
    const totalCost   = parseFloat(summary[0]?.cost ?? '0');

    return {
      summary: {
        total:           parseInt(summary[0]?.total ?? '0', 10),
        active:          parseInt(summary[0]?.active ?? '0', 10),
        completed:       parseInt(summary[0]?.completed ?? '0', 10),
        totalBudget,
        totalActualCost: totalCost,
        budgetVariance:  Math.round((totalBudget - totalCost) * 100) / 100,
        overBudgetCount: parseInt(summary[0]?.over_budget ?? '0', 10),
      },
      byStatus: byStatus.map((r) => ({
        status:      r.status,
        count:       parseInt(r.cnt, 10),
        totalBudget: parseFloat(r.budget),
      })),
      topByHours: topProjects.map((r) => ({
        projectId:    r.project_id,
        code:         r.code,
        name:         r.name,
        totalHours:   parseFloat(r.hours),
        billableHours: parseFloat(r.billable),
        cost:         parseFloat(r.cost),
      })),
      teamProductivity: productivity.map((r) => ({
        userId:       r.user_id,
        name:         `${r.first_name} ${r.last_name}`,
        totalHours:   parseFloat(r.hours),
        billableHours: parseFloat(r.billable),
        totalCost:    parseFloat(r.cost),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. RAPPORT TICKETS (SAV)
  // ─────────────────────────────────────────────────────────────

  async getTicketsReport(query: DateRangeDto): Promise<{
    summary: {
      total: number;
      resolved: number;
      avgResolutionHours: number;
      slaResponseRate: number;
      slaResolutionRate: number;
      avgSatisfactionScore: number;
    };
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number; avgResolutionHours: number }[];
    timeline: { period: string; opened: number; resolved: number }[];
  }> {
    const trunc = this.groupByTrunc(query.groupBy);
    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (query.from) parts.push(`${alias}.created_at >= '${query.from}'`);
      if (query.to)   parts.push(`${alias}.created_at <= '${query.to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };

    const [summary, byStatus, byPriority, timeline] = await Promise.all([
      this.dataSource.query<{
        total: string; resolved: string; avg_res: string;
        sla_response: string; sla_resolution: string; avg_score: string;
      }[]>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)
            FILTER (WHERE resolved_at IS NOT NULL) AS avg_res,
          (COUNT(*) FILTER (WHERE sla_response_met = true)::float
            / NULLIF(COUNT(*) FILTER (WHERE first_response_at IS NOT NULL), 0)) * 100 AS sla_response,
          (COUNT(*) FILTER (WHERE sla_resolution_met = true)::float
            / NULLIF(COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')), 0)) * 100 AS sla_resolution,
          AVG(satisfaction_score) FILTER (WHERE satisfaction_score IS NOT NULL) AS avg_score
        FROM tickets
        WHERE deleted_at IS NULL ${dateClause('tickets')}
      `),

      this.dataSource.query<{ status: string; cnt: string }[]>(`
        SELECT status, COUNT(*) AS cnt
        FROM tickets WHERE deleted_at IS NULL ${dateClause('tickets')}
        GROUP BY status ORDER BY cnt DESC
      `),

      this.dataSource.query<{ priority: string; cnt: string; avg_res: string }[]>(`
        SELECT
          priority,
          COUNT(*) AS cnt,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)
            FILTER (WHERE resolved_at IS NOT NULL) AS avg_res
        FROM tickets WHERE deleted_at IS NULL ${dateClause('tickets')}
        GROUP BY priority ORDER BY cnt DESC
      `),

      this.dataSource.query<{ period: string; opened: string; resolved: string }[]>(`
        SELECT
          DATE_TRUNC('${trunc}', created_at)::date::text AS period,
          COUNT(*) AS opened,
          COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved
        FROM tickets WHERE deleted_at IS NULL ${dateClause('tickets')}
        GROUP BY 1 ORDER BY 1
      `),
    ]);

    return {
      summary: {
        total:               parseInt(summary[0]?.total ?? '0', 10),
        resolved:            parseInt(summary[0]?.resolved ?? '0', 10),
        avgResolutionHours:  Math.round(parseFloat(summary[0]?.avg_res ?? '0') * 10) / 10,
        slaResponseRate:     Math.round(parseFloat(summary[0]?.sla_response ?? '0') * 10) / 10,
        slaResolutionRate:   Math.round(parseFloat(summary[0]?.sla_resolution ?? '0') * 10) / 10,
        avgSatisfactionScore: Math.round(parseFloat(summary[0]?.avg_score ?? '0') * 10) / 10,
      },
      byStatus: byStatus.map((r) => ({ status: r.status, count: parseInt(r.cnt, 10) })),
      byPriority: byPriority.map((r) => ({
        priority:            r.priority,
        count:               parseInt(r.cnt, 10),
        avgResolutionHours:  Math.round(parseFloat(r.avg_res ?? '0') * 10) / 10,
      })),
      timeline: timeline.map((r) => ({
        period:   r.period,
        opened:   parseInt(r.opened, 10),
        resolved: parseInt(r.resolved, 10),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 7. RAPPORT ACHATS FOURNISSEURS
  // ─────────────────────────────────────────────────────────────

  async getPurchasesReport(query: DateRangeDto): Promise<{
    summary: {
      totalOrders: number;
      totalHT: number;
      totalTTC: number;
      totalPaid: number;
      pendingPayment: number;
    };
    bySupplier: { supplierId: string; name: string; ordersCount: number; totalHT: number }[];
    topProducts: { productId: string; sku: string; name: string; qty: number; totalHT: number }[];
    timeline: { period: string; totalHT: number; count: number }[];
  }> {
    const trunc = this.groupByTrunc(query.groupBy);
    const dateClause = (alias: string) => {
      const parts: string[] = [];
      if (query.from) parts.push(`${alias}.created_at >= '${query.from}'`);
      if (query.to)   parts.push(`${alias}.created_at <= '${query.to}T23:59:59.999Z'`);
      return parts.length ? 'AND ' + parts.join(' AND ') : '';
    };
    const limit = query.limit ?? 10;

    const [summary, bySupplier, topProducts, timeline] = await Promise.all([
      this.dataSource.query<{
        cnt: string; ht: string; ttc: string; paid: string;
      }[]>(`
        SELECT
          COUNT(DISTINCT po.id) AS cnt,
          COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100)), 0) AS ht,
          COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100) * (1 + l.tax_rate/100)), 0) AS ttc,
          COALESCE(SUM(po.paid_amount), 0) AS paid
        FROM purchase_orders po
        JOIN purchase_order_lines l ON l.purchase_order_id = po.id
        WHERE po.deleted_at IS NULL
          AND po.status NOT IN ('DRAFT','CANCELLED')
          ${dateClause('po')}
      `),

      this.dataSource.query<{ supplier_id: string; name: string; cnt: string; ht: string }[]>(`
        SELECT
          s.id AS supplier_id, s.name,
          COUNT(DISTINCT po.id) AS cnt,
          COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100)), 0) AS ht
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        JOIN purchase_order_lines l ON l.purchase_order_id = po.id
        WHERE po.deleted_at IS NULL
          AND po.status NOT IN ('DRAFT','CANCELLED')
          ${dateClause('po')}
        GROUP BY s.id, s.name
        ORDER BY ht DESC
        LIMIT ${limit}
      `),

      this.dataSource.query<{ product_id: string; sku: string; name: string; qty: string; ht: string }[]>(`
        SELECT
          p.id AS product_id, p.sku, p.name,
          COALESCE(SUM(l.quantity), 0) AS qty,
          COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100)), 0) AS ht
        FROM purchase_order_lines l
        JOIN purchase_orders po ON po.id = l.purchase_order_id
        JOIN products p ON p.id = l.product_id
        WHERE po.deleted_at IS NULL
          AND po.status NOT IN ('DRAFT','CANCELLED')
          ${dateClause('po')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY ht DESC
        LIMIT ${limit}
      `),

      this.dataSource.query<{ period: string; ht: string; cnt: string }[]>(`
        SELECT
          DATE_TRUNC('${trunc}', po.created_at)::date::text AS period,
          COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_percent/100)), 0) AS ht,
          COUNT(DISTINCT po.id) AS cnt
        FROM purchase_orders po
        JOIN purchase_order_lines l ON l.purchase_order_id = po.id
        WHERE po.deleted_at IS NULL
          AND po.status NOT IN ('DRAFT','CANCELLED')
          ${dateClause('po')}
        GROUP BY 1 ORDER BY 1
      `),
    ]);

    const totalHT  = parseFloat(summary[0]?.ht ?? '0');
    const totalPaid = parseFloat(summary[0]?.paid ?? '0');

    return {
      summary: {
        totalOrders:    parseInt(summary[0]?.cnt ?? '0', 10),
        totalHT,
        totalTTC:       parseFloat(summary[0]?.ttc ?? '0'),
        totalPaid,
        pendingPayment: Math.max(0, parseFloat(summary[0]?.ttc ?? '0') - totalPaid),
      },
      bySupplier: bySupplier.map((r) => ({
        supplierId:  r.supplier_id,
        name:        r.name,
        ordersCount: parseInt(r.cnt, 10),
        totalHT:     parseFloat(r.ht),
      })),
      topProducts: topProducts.map((r) => ({
        productId: r.product_id,
        sku:       r.sku,
        name:      r.name,
        qty:       parseFloat(r.qty),
        totalHT:   parseFloat(r.ht),
      })),
      timeline: timeline.map((r) => ({
        period:  r.period,
        totalHT: parseFloat(r.ht),
        count:   parseInt(r.cnt, 10),
      })),
    };
  }
}
