import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, LessThan } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto, RecordPaymentDto } from '../dto/update-sales.dto';
import { QueryInvoicesDto } from '../dto/query-sales.dto';
import { InvoiceStatus } from '../enums/sales.enums';
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
    return this.dataSource.transaction(async (manager) => {
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
        status: InvoiceStatus.DRAFT,
        paidAmount: 0,
        ...totals,
      });
      const saved = await manager.save(invoice);

      const lines = dto.lines.map((l, idx) =>
        manager.create(SaleLine, {
          ...l,
          invoiceId: saved.id,
          sortOrder: l.sortOrder ?? idx,
          discountType: l.discountType ?? 'PERCENT',
          discountValue: l.discountValue ?? 0,
          taxRate: l.taxRate ?? 20,
        }),
      );
      await manager.save(lines);

      this.logger.log(`Facture créée : ${saved.number}`);
      return this.findOne(saved.id);
    });
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

  async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (![InvoiceStatus.DRAFT].includes(invoice.status)) {
      throw new BadRequestException('Seule une facture en brouillon peut être modifiée');
    }

    return this.dataSource.transaction(async (manager) => {
      const totals = dto.lines
        ? this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent ?? invoice.globalDiscountPercent)
        : null;

      Object.assign(invoice, {
        ...dto,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : invoice.issueDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
        ...(totals ?? {}),
      });
      await manager.save(invoice);

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
          }),
        );
        await manager.save(lines);
      }
      return this.findOne(id);
    });
  }

  async send(id: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Seule une facture en brouillon peut être envoyée');
    }
    invoice.status = InvoiceStatus.SENT;
    return this.invoiceRepo.save(invoice);
  }

  async recordPayment(id: string, dto: RecordPaymentDto): Promise<Invoice> {
    const invoice = await this.findOne(id);
    const locked = [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED];
    if (locked.includes(invoice.status)) {
      throw new BadRequestException(`Impossible d'enregistrer un paiement sur une facture ${invoice.status}`);
    }
    if (dto.amount > invoice.remainingAmount + 0.01) {
      throw new BadRequestException(
        `Montant ${dto.amount} dépasse le reste à payer ${invoice.remainingAmount}`,
      );
    }

    invoice.paidAmount = Math.round((Number(invoice.paidAmount) + dto.amount) * 100) / 100;
    invoice.paymentMethod = dto.paymentMethod;
    invoice.paymentReference = dto.paymentReference;
    invoice.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    if (invoice.paidAmount >= Number(invoice.totalTTC) - 0.01) {
      invoice.status = InvoiceStatus.PAID;
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    this.logger.log(`Paiement de ${dto.amount} enregistré sur facture ${invoice.number}`);
    return this.invoiceRepo.save(invoice);
  }

  async cancel(id: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Une facture payée ne peut être annulée, utilisez le remboursement');
    }
    invoice.status = InvoiceStatus.CANCELLED;
    return this.invoiceRepo.save(invoice);
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
