import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, LessThan } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Order } from '../entities/order.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto, RecordPaymentDto } from '../dto/update-sales.dto';
import { QueryInvoicesDto } from '../dto/query-sales.dto';
import { InvoiceStatus, OrderStatus } from '../enums/sales.enums';
import { SalesCalculatorService } from './sales-calculator.service';
import { paginate } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SaleLine) private readonly lineRepo: Repository<SaleLine>,
    private readonly calc: SalesCalculatorService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateInvoiceDto, createdById: string): Promise<Invoice> {
    let savedId!: string;

    await this.dataSource.transaction(async (manager) => {
      // Anti-doublon : une commande ne peut être facturée qu'une seule fois
      if (dto.orderId) {
        const existing = await manager.findOne(Invoice, { where: { orderId: dto.orderId } });
        if (existing && existing.status !== InvoiceStatus.CANCELLED) {
          throw new BadRequestException(
            `Cette commande est déjà facturée (facture ${existing.number}).`,
          );
        }
      }

      const totals = this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent);

      const invoice = manager.create(Invoice, {
        customerId: dto.customerId,
        orderId: dto.orderId,
        subject: dto.subject,
        notes: dto.notes,
        terms: dto.terms,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        globalDiscountPercent: dto.globalDiscountPercent ?? 0,
        assignedToId: dto.assignedToId ?? createdById,
        // Facture issue d'une commande = émise directement (compte dans le CA).
        // Facture créée sans commande source = brouillon (à envoyer ensuite).
        status: dto.orderId ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
        paidAmount: 0,
        ...totals,
      });
      const saved = await manager.save(invoice);
      savedId = saved.id;

      const lines = dto.lines.map((l, idx) =>
        manager.create(SaleLine, {
          ...l,
          invoiceId: saved.id,
          sortOrder: l.sortOrder ?? idx,
          discountType: l.discountType ?? 'PERCENT',
          discountValue: l.discountValue ?? 0,
          taxRate: l.taxRate ?? 20,
        } as any),
      );
      await manager.save(lines);

      // La commande source passe en « Facturée » (masque le bouton « Facturer »)
      if (dto.orderId) {
        await manager.update(Order, dto.orderId, { status: OrderStatus.INVOICED });
      }

      this.logger.log(`Facture créée : ${saved.number}`);
    });

    return this.findOne(savedId);
  }

  async findAll(query: QueryInvoicesDto): Promise<PaginatedResult<Invoice>> {
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.customer', 'customer')
      .leftJoinAndSelect('i.assignedTo', 'assignedTo');

    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (query.customerId) qb.andWhere('i.customerId = :cid', { cid: query.customerId });
    if (query.assignedToId) qb.andWhere('i.assignedToId = :aid', { aid: query.assignedToId });
    if (query.dateFrom) qb.andWhere('i.issueDate >= :from', { from: query.dateFrom });
    if (query.dateTo) qb.andWhere('i.issueDate <= :to', { to: query.dateTo });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('i.number ILIKE :q', { q: `%${query.search}%` })
            .orWhere('i.subject ILIKE :q', { q: `%${query.search}%` })
            .orWhere('customer.name ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['customer', 'assignedTo', 'lines', 'lines.product'],
    });
    if (!inv) throw new NotFoundException(`Facture ${id} introuvable`);
    return inv;
  }

  /**
   * Comptes clients : solde par client agrégé sur TOUTES les factures
   * (exact quel que soit le volume — pas de limite de pagination).
   */
  async customerAccounts(): Promise<Array<{
    customerId: string; name: string; code: string | null;
    invoiced: number; paid: number; balance: number; count: number; overdue: number;
  }>> {
    const rows = await this.dataSource.query<any[]>(`
      SELECT
        c.id   AS "customerId",
        c.name AS name,
        c.code AS code,
        COALESCE(SUM(i.total_ttc), 0) AS invoiced,
        COALESCE(SUM(i.paid_amount), 0) AS paid,
        COALESCE(SUM(CASE WHEN i.status <> 'CANCELLED' THEN i.total_ttc - i.paid_amount ELSE 0 END), 0) AS balance,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE i.status = 'OVERDUE') AS overdue
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.deleted_at IS NULL
      GROUP BY c.id, c.name, c.code
      ORDER BY balance DESC, invoiced DESC
    `);
    return rows.map((r) => ({
      customerId: r.customerId,
      name: r.name,
      code: r.code ?? null,
      invoiced: Math.round(Number(r.invoiced)),
      paid: Math.round(Number(r.paid)),
      balance: Math.round(Number(r.balance)),
      count: Number(r.count),
      overdue: Number(r.overdue),
    }));
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    if (![InvoiceStatus.DRAFT].includes(invoice.status)) {
      throw new BadRequestException('Seule une facture en brouillon peut être modifiée');
    }

    await this.dataSource.transaction(async (manager) => {
      const totals = dto.lines
        ? this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent ?? invoice.globalDiscountPercent)
        : null;

      await manager.update(Invoice, id, {
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.terms !== undefined ? { terms: dto.terms } : {}),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.globalDiscountPercent !== undefined ? { globalDiscountPercent: dto.globalDiscountPercent } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
        ...(totals ?? {}),
      });

      if (dto.lines) {
        await manager.delete(SaleLine, { invoiceId: id });
        const lines = dto.lines.map((l, idx) =>
          manager.create(SaleLine, {
            ...l,
            invoiceId: id,
            sortOrder: l.sortOrder ?? idx,
            discountType: l.discountType ?? 'PERCENT',
            discountValue: l.discountValue ?? 0,
            taxRate: l.taxRate ?? 20,
          } as any),
        );
        await manager.save(lines);
      }
    });

    return this.findOne(id);
  }

  async send(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Seule une facture en brouillon peut être envoyée');
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.SENT });
    return this.findOne(id);
  }

  async recordPayment(id: string, dto: RecordPaymentDto): Promise<Invoice> {
    // Charger sans relations pour éviter cascade-save
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    const locked = [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED];
    if (locked.includes(invoice.status)) {
      throw new BadRequestException(`Impossible d'enregistrer un paiement sur une facture ${invoice.status}`);
    }
    const remainingAmount = Math.round(Number(invoice.totalTTC) - Number(invoice.paidAmount));
    if (dto.amount > remainingAmount + 0.01) {
      throw new BadRequestException(
        `Montant ${dto.amount} dépasse le reste à payer ${remainingAmount}`,
      );
    }

    const newPaidAmount = Math.round(Number(invoice.paidAmount) + dto.amount);
    const newStatus = newPaidAmount >= Number(invoice.totalTTC) - 0.01
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTIALLY_PAID;

    await this.invoiceRepo.update(id, {
      paidAmount: newPaidAmount,
      paymentMethod: dto.paymentMethod,
      paymentReference: dto.paymentReference,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      status: newStatus,
    });

    this.logger.log(`Paiement de ${dto.amount} enregistré sur facture ${invoice.number}`);
    return this.findOne(id);
  }

  async cancel(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Une facture payée ne peut être annulée, utilisez le remboursement');
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.CANCELLED });
    return this.findOne(id);
  }

  /**
   * Avoir / remboursement : passe la facture émise en REFUNDED.
   * Son montant sort automatiquement du chiffre d'affaires (le filtre CA
   * ne compte que SENT/PARTIALLY_PAID/PAID/OVERDUE).
   */
  async refund(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    const notRefundable = [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED];
    if (notRefundable.includes(invoice.status)) {
      throw new BadRequestException(`Impossible de créer un avoir sur une facture ${invoice.status}`);
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.REFUNDED });
    return this.findOne(id);
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.customer', 'customer')
      .where('i.status IN (:...statuses)', {
        statuses: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
      })
      .andWhere('i.dueDate < :now', { now })
      .orderBy('i.dueDate', 'ASC')
      .getMany();
  }

  async markOverdue(): Promise<number> {
    const result = await this.invoiceRepo
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.OVERDUE })
      .where('status IN (:...statuses)', {
        statuses: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
      })
      .andWhere('dueDate < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
}
