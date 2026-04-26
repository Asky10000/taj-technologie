import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Quote } from '../entities/quote.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-sales.dto';
import { QueryQuotesDto } from '../dto/query-sales.dto';
import { QuoteStatus } from '../enums/sales.enums';
import { SalesCalculatorService } from './sales-calculator.service';
import { paginate } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(SaleLine) private readonly lineRepo: Repository<SaleLine>,
    private readonly calc: SalesCalculatorService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateQuoteDto, createdById: string): Promise<Quote> {
    let savedId!: string;

    await this.dataSource.transaction(async (manager) => {
      const totals = this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent);

      const quote = manager.create(Quote, {
        customerId: dto.customerId,
        subject: dto.subject,
        notes: dto.notes,
        terms: dto.terms,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        globalDiscountPercent: dto.globalDiscountPercent ?? 0,
        assignedToId: dto.assignedToId ?? createdById,
        status: QuoteStatus.DRAFT,
        ...totals,
      });
      const saved = await manager.save(quote);
      savedId = saved.id;

      const lines = dto.lines.map((l, idx) =>
        manager.create(SaleLine, {
          ...l,
          quoteId: saved.id,
          sortOrder: l.sortOrder ?? idx,
          discountType: l.discountType ?? 'PERCENT',
          discountValue: l.discountValue ?? 0,
          taxRate: l.taxRate ?? 20,
        } as any),
      );
      await manager.save(lines);

      this.logger.log(`Devis créé : ${saved.number}`);
    });

    // findOne est appelé APRÈS le commit de la transaction pour voir les données engagées
    return this.findOne(savedId);
  }

  async findAll(query: QueryQuotesDto): Promise<PaginatedResult<Quote>> {
    const qb = this.quoteRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.customer', 'customer')
      .leftJoinAndSelect('q.assignedTo', 'assignedTo');

    if (query.status) qb.andWhere('q.status = :status', { status: query.status });
    if (query.customerId) qb.andWhere('q.customerId = :cid', { cid: query.customerId });
    if (query.assignedToId) qb.andWhere('q.assignedToId = :aid', { aid: query.assignedToId });
    if (query.dateFrom) qb.andWhere('q.issueDate >= :from', { from: query.dateFrom });
    if (query.dateTo) qb.andWhere('q.issueDate <= :to', { to: query.dateTo });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('q.number ILIKE :q', { q: `%${query.search}%` })
            .orWhere('q.subject ILIKE :q', { q: `%${query.search}%` })
            .orWhere('customer.name ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Quote> {
    const q = await this.quoteRepo.findOne({
      where: { id },
      relations: ['customer', 'assignedTo', 'lines', 'lines.product'],
    });
    if (!q) throw new NotFoundException(`Devis ${id} introuvable`);
    return q;
  }

  async update(id: string, dto: UpdateQuoteDto): Promise<Quote> {
    const quote = await this.quoteRepo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException(`Devis ${id} introuvable`);
    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Un devis converti ne peut être modifié');
    }

    await this.dataSource.transaction(async (manager) => {
      const totals = dto.lines
        ? this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent ?? quote.globalDiscountPercent)
        : null;

      // update() ciblé — évite le cascade-save sur les lignes
      await manager.update(Quote, id, {
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.terms !== undefined ? { terms: dto.terms } : {}),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.validUntil ? { validUntil: new Date(dto.validUntil) } : {}),
        ...(dto.globalDiscountPercent !== undefined ? { globalDiscountPercent: dto.globalDiscountPercent } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
        ...(totals ?? {}),
      });

      if (dto.lines) {
        await manager.delete(SaleLine, { quoteId: id });
        const lines = dto.lines.map((l, idx) =>
          manager.create(SaleLine, {
            ...l,
            quoteId: id,
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

  async updateStatus(id: string, status: QuoteStatus): Promise<Quote> {
    // Charger sans relations pour éviter un cascade-save non désiré
    const quote = await this.quoteRepo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException(`Devis ${id} introuvable`);
    const allowed: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT, QuoteStatus.REJECTED],
      [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      [QuoteStatus.ACCEPTED]: [QuoteStatus.CONVERTED],
      [QuoteStatus.REJECTED]: [],
      [QuoteStatus.EXPIRED]: [],
      [QuoteStatus.CONVERTED]: [],
    };
    if (!allowed[quote.status].includes(status)) {
      throw new BadRequestException(
        `Transition ${quote.status} → ${status} non autorisée`,
      );
    }
    await this.quoteRepo.update(id, { status });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const quote = await this.findOne(id);
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Seul un devis en brouillon peut être supprimé');
    }
    await this.quoteRepo.softRemove(quote);
  }
}
