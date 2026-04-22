import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Quote } from '../entities/quote.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-sales.dto';
import { QueryOrdersDto } from '../dto/query-sales.dto';
import { OrderStatus, QuoteStatus } from '../enums/sales.enums';
import { SalesCalculatorService } from './sales-calculator.service';
import { InventoryService } from '../../inventory/inventory.service';
import { MovementType, MovementReason } from '../../inventory/enums/inventory.enums';
import { paginate } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(SaleLine) private readonly lineRepo: Repository<SaleLine>,
    private readonly calc: SalesCalculatorService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, createdById: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const totals = this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent);

      const order = manager.create(Order, {
        customerId: dto.customerId,
        quoteId: dto.quoteId,
        subject: dto.subject,
        notes: dto.notes,
        terms: dto.terms,
        orderDate: new Date(dto.orderDate),
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : undefined,
        shippingAddress: dto.shippingAddress,
        globalDiscountPercent: dto.globalDiscountPercent ?? 0,
        assignedToId: dto.assignedToId ?? createdById,
        status: OrderStatus.PENDING,
        ...totals,
      });
      const saved = await manager.save(order);

      const lines = dto.lines.map((l, idx) =>
        manager.create(SaleLine, {
          ...l,
          orderId: saved.id,
          sortOrder: l.sortOrder ?? idx,
          discountType: l.discountType ?? 'PERCENT',
          discountValue: l.discountValue ?? 0,
          taxRate: l.taxRate ?? 20,
        }),
      );
      await manager.save(lines);

      // Marquer le devis comme converti si lié
      if (dto.quoteId) {
        await manager.update(Quote, dto.quoteId, {
          status: QuoteStatus.CONVERTED,
          convertedOrderId: saved.id,
          convertedAt: new Date(),
        });
      }

      this.logger.log(`Commande créée : ${saved.number}`);
      return this.findOne(saved.id);
    });
  }

  async findAll(query: QueryOrdersDto): Promise<PaginatedResult<Order>> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.assignedTo', 'assignedTo');

    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.customerId) qb.andWhere('o.customerId = :cid', { cid: query.customerId });
    if (query.assignedToId) qb.andWhere('o.assignedToId = :aid', { aid: query.assignedToId });
    if (query.dateFrom) qb.andWhere('o.orderDate >= :from', { from: query.dateFrom });
    if (query.dateTo) qb.andWhere('o.orderDate <= :to', { to: query.dateTo });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('o.number ILIKE :q', { q: `%${query.search}%` })
            .orWhere('o.subject ILIKE :q', { q: `%${query.search}%` })
            .orWhere('customer.name ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Order> {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'assignedTo', 'lines', 'lines.product'],
    });
    if (!o) throw new NotFoundException(`Commande ${id} introuvable`);
    return o;
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const lockedStatuses = [OrderStatus.DELIVERED, OrderStatus.INVOICED, OrderStatus.CANCELLED];
    if (lockedStatuses.includes(order.status)) {
      throw new BadRequestException(`Impossible de modifier une commande en statut ${order.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const totals = dto.lines
        ? this.calc.calculateDocument(dto.lines, dto.globalDiscountPercent ?? order.globalDiscountPercent)
        : null;

      Object.assign(order, {
        ...dto,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : order.orderDate,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : order.expectedDeliveryDate,
        ...(totals ?? {}),
      });
      await manager.save(order);

      if (dto.lines) {
        await manager.delete(SaleLine, { orderId: id });
        const lines = dto.lines.map((l, idx) =>
          manager.create(SaleLine, {
            ...l,
            orderId: id,
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

  async updateStatus(id: string, status: OrderStatus, userId: string): Promise<Order> {
    const order = await this.findOne(id);
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.PARTIALLY_DELIVERED, OrderStatus.DELIVERED],
      [OrderStatus.PARTIALLY_DELIVERED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.INVOICED],
      [OrderStatus.INVOICED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    if (!allowed[order.status].includes(status)) {
      throw new BadRequestException(`Transition ${order.status} → ${status} non autorisée`);
    }

    // À la livraison : sortie de stock pour chaque ligne produit tracké
    if (status === OrderStatus.DELIVERED) {
      for (const line of order.lines ?? []) {
        if (line.productId) {
          try {
            const stock = await this.inventoryService.findStockByProduct(line.productId);
            await this.inventoryService.addMovement(
              {
                stockId: stock.id,
                type: MovementType.OUT,
                reason: MovementReason.SALE,
                quantity: Number(line.quantity),
                referenceType: 'ORDER',
                referenceId: order.id,
                notes: `Commande ${order.number}`,
                occurredAt: new Date().toISOString(),
              },
              userId,
            );
          } catch {
            // Stock non géré (services/logiciels) — on ignore
          }
        }
      }
      order.deliveredAt = new Date();
    }

    order.status = status;
    return this.orderRepo.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Seule une commande en attente peut être supprimée');
    }
    await this.orderRepo.softRemove(order);
  }
}
