import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import {
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderStatusDto,
  ReceiveGoodsDto,
  RecordPaymentDto,
} from './dto/supplier-actions.dto';
import { PurchaseOrderStatus, PaymentStatus } from './enums/supplier.enums';
import { InventoryService } from '../inventory/inventory.service';
import { MovementType, MovementReason } from '../inventory/enums/inventory.enums';
import { StockPolicy } from '../products/enums/product.enums';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { paginate } from '../../common/utils/pagination.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const PO_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]:              [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SENT]:               [PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.CONFIRMED]:          [PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.RECEIVED]:           [],
  [PurchaseOrderStatus.CANCELLED]:          [],
};

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // FOURNISSEURS
  // ─────────────────────────────────────────────────────────────

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepo.create({
      ...dto,
      tags: dto.tags ?? [],
      currency: dto.currency ?? 'EUR',
      paymentTermsDays: dto.paymentTermsDays ?? 30,
    });
    const saved = await this.supplierRepo.save(supplier);
    this.logger.log(`Fournisseur créé : ${saved.code} — ${saved.name}`);
    return saved;
  }

  async findAllSuppliers(query: PaginationDto): Promise<PaginatedResult<Supplier>> {
    const qb = this.supplierRepo.createQueryBuilder('s');

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) =>
          sub
            .where('s.name ILIKE :q', { q: `%${query.search}%` })
            .orWhere('s.code ILIKE :q', { q: `%${query.search}%` })
            .orWhere('s.email ILIKE :q', { q: `%${query.search}%` }),
        ),
      );
    }

    qb.orderBy('s.name', 'ASC');
    return paginate(qb, query);
  }

  async findOneSupplier(id: string): Promise<Supplier> {
    const s = await this.supplierRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Fournisseur ${id} introuvable`);
    return s;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOneSupplier(id);
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async removeSupplier(id: string): Promise<void> {
    const supplier = await this.findOneSupplier(id);
    const activeOrders = await this.poRepo.count({
      where: [
        { supplierId: id, status: PurchaseOrderStatus.SENT },
        { supplierId: id, status: PurchaseOrderStatus.CONFIRMED },
        { supplierId: id, status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
      ],
    });
    if (activeOrders > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un fournisseur avec des commandes actives',
      );
    }
    await this.supplierRepo.softRemove(supplier);
  }

  async getSupplierStats(): Promise<{
    total: number;
    active: number;
    totalPurchasesHT: number;
    pendingOrdersCount: number;
  }> {
    const total = await this.supplierRepo.count();
    const active = await this.supplierRepo.count({ where: { status: 'ACTIVE' as any } });

    const purchasesResult = await this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.lines', 'l')
      .where('po.status IN (:...statuses)', {
        statuses: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
      })
      .getMany();

    const totalPurchasesHT = purchasesResult.reduce((s, po) => s + po.totalHT, 0);

    const pendingOrdersCount = await this.poRepo.count({
      where: [
        { status: PurchaseOrderStatus.SENT },
        { status: PurchaseOrderStatus.CONFIRMED },
        { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
      ],
    });

    return { total, active, totalPurchasesHT, pendingOrdersCount };
  }

  // ─────────────────────────────────────────────────────────────
  // BONS DE COMMANDE FOURNISSEUR
  // ─────────────────────────────────────────────────────────────

  async createPurchaseOrder(
    dto: CreatePurchaseOrderDto,
    currentUser: AuthenticatedUser,
  ): Promise<PurchaseOrder> {
    await this.findOneSupplier(dto.supplierId);
    if (!dto.lines?.length) {
      throw new BadRequestException('La commande doit contenir au moins une ligne');
    }

    const po = this.poRepo.create({
      supplierId: dto.supplierId,
      createdById: currentUser.sub,
      expectedDeliveryDate: dto.expectedDeliveryDate as any,
      supplierReference: dto.supplierReference,
      shippingCost: dto.shippingCost ?? 0,
      notes: dto.notes,
      lines: dto.lines.map((l) =>
        this.lineRepo.create({
          productId: l.productId,
          designation: l.designation,
          supplierRef: l.supplierRef,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate ?? 20,
          discountPercent: l.discountPercent ?? 0,
        }),
      ),
    });

    const saved = await this.poRepo.save(po);
    this.logger.log(`Commande fournisseur créée : ${saved.code}`);
    return this.findOnePurchaseOrder(saved.id);
  }

  async findAllPurchaseOrders(
    query: PaginationDto & { supplierId?: string; status?: PurchaseOrderStatus },
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.createdBy', 'createdBy');

    if (query.supplierId) {
      qb.andWhere('po.supplierId = :sid', { sid: query.supplierId });
    }
    if (query.status) {
      qb.andWhere('po.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(po.code ILIKE :q OR supplier.name ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    qb.orderBy('po.createdAt', 'DESC');
    return paginate(qb, query);
  }

  async findOnePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['supplier', 'createdBy', 'lines', 'lines.product'],
    });
    if (!po) throw new NotFoundException(`Commande ${id} introuvable`);
    return po;
  }

  async updatePurchaseOrder(
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOnePurchaseOrder(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une commande en BROUILLON peut être modifiée',
      );
    }
    Object.assign(po, dto);
    await this.poRepo.save(po);
    return this.findOnePurchaseOrder(id);
  }

  async updatePurchaseOrderStatus(
    id: string,
    dto: UpdatePurchaseOrderStatusDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOnePurchaseOrder(id);
    const allowed = PO_STATUS_TRANSITIONS[po.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${po.status} → ${dto.status} non autorisée`,
      );
    }

    po.status = dto.status;
    if (dto.status === PurchaseOrderStatus.SENT && !po.sentAt) {
      po.sentAt = new Date();
    }
    if (dto.status === PurchaseOrderStatus.RECEIVED && !po.receivedAt) {
      po.receivedAt = new Date();
    }
    await this.poRepo.save(po);
    return this.findOnePurchaseOrder(id);
  }

  async cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return this.updatePurchaseOrderStatus(id, {
      status: PurchaseOrderStatus.CANCELLED,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RÉCEPTION DE MARCHANDISES
  // ─────────────────────────────────────────────────────────────

  async receiveGoods(
    id: string,
    dto: ReceiveGoodsDto,
    currentUser: AuthenticatedUser,
  ): Promise<PurchaseOrder> {
    const po = await this.findOnePurchaseOrder(id);

    if (![PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(po.status)) {
      throw new BadRequestException(
        'La commande doit être CONFIRMÉE ou PARTIELLEMENT REÇUE pour réceptionner',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const reception of dto.lines) {
        const line = po.lines.find((l) => l.id === reception.lineId);
        if (!line) {
          throw new NotFoundException(`Ligne ${reception.lineId} introuvable`);
        }

        const remaining = Number(line.quantity) - Number(line.receivedQuantity);
        if (reception.receivedQuantity > remaining + 0.001) {
          throw new BadRequestException(
            `Quantité reçue (${reception.receivedQuantity}) supérieure au reliquat (${remaining}) pour "${line.designation}"`,
          );
        }

        // Mise à jour de la quantité reçue sur la ligne
        line.receivedQuantity = Number(line.receivedQuantity) + reception.receivedQuantity;
        await manager.save(PurchaseOrderLine, line);

        // Entrée en stock si le produit est suivi
        if (line.productId && line.product?.stockPolicy === StockPolicy.TRACKED) {
          // Chercher ou créer un stock pour ce produit
          const stock = await this.inventoryService.findOrCreateStock(
            line.productId,
            currentUser.sub,
          );

          await this.inventoryService.addMovement(
            {
              stockId: stock.id,
              type: MovementType.IN,
              reason: MovementReason.PURCHASE,
              quantity: reception.receivedQuantity,
              unitCost: Number(line.unitPrice),
              notes: dto.receptionNotes ?? `Réception BCA ${po.code}`,
              referenceType: 'PurchaseOrder',
              referenceId: po.id,
            },
            currentUser.sub,
          );
        }
      }

      // Calculer nouveau statut
      const updatedLines = await manager.find(PurchaseOrderLine, {
        where: { purchaseOrderId: id },
      });

      const allReceived = updatedLines.every(
        (l) => Number(l.receivedQuantity) >= Number(l.quantity) - 0.001,
      );
      const anyReceived = updatedLines.some((l) => Number(l.receivedQuantity) > 0);

      po.status = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : anyReceived
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : po.status;

      if (po.status === PurchaseOrderStatus.RECEIVED && !po.receivedAt) {
        po.receivedAt = new Date();
      }

      await manager.save(PurchaseOrder, po);
    });

    this.logger.log(`Réception BCA ${po.code} — statut : ${po.status}`);
    return this.findOnePurchaseOrder(id);
  }

  // ─────────────────────────────────────────────────────────────
  // PAIEMENT FOURNISSEUR
  // ─────────────────────────────────────────────────────────────

  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOnePurchaseOrder(id);

    if (po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Impossible d\'enregistrer un paiement sur une commande brouillon ou annulée',
      );
    }

    const newPaidAmount = Number(po.paidAmount) + dto.amount;

    if (newPaidAmount > po.totalTTC + 0.01) {
      throw new BadRequestException(
        `Paiement (${newPaidAmount.toFixed(2)}) dépasse le total TTC (${po.totalTTC.toFixed(2)})`,
      );
    }

    po.paidAmount = newPaidAmount;

    if (po.remainingAmount <= 0.01) {
      po.paymentStatus = PaymentStatus.PAID;
    } else if (Number(po.paidAmount) > 0) {
      po.paymentStatus = PaymentStatus.PARTIALLY_PAID;
    }

    await this.poRepo.save(po);
    return this.findOnePurchaseOrder(id);
  }
}
