import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, LessThanOrEqual } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateMovementDto, AdjustStockDto } from './dto/stock-movement.dto';
import { QueryStockDto, QueryMovementsDto } from './dto/query-stock.dto';
import { MovementType, MovementReason, StockAlertLevel } from './enums/inventory.enums';
import { StockPolicy } from '../products/enums/product.enums';
import { paginate } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Stock)   private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // STOCK — CRUD
  // ─────────────────────────────────────────────────────────────
  async createStock(dto: CreateStockDto): Promise<Stock> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Produit ${dto.productId} introuvable`);

    const existing = await this.stockRepo.findOne({ where: { productId: dto.productId } });
    if (existing) {
      throw new ConflictException(`Un stock existe déjà pour le produit ${product.sku}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const stock = manager.create(Stock, {
        productId: dto.productId,
        quantity: dto.quantity ?? 0,
        reservedQuantity: 0,
        minQuantity: dto.minQuantity ?? 0,
        reorderQuantity: dto.reorderQuantity ?? 0,
        maxQuantity: dto.maxQuantity ?? 0,
        avgCostPrice: dto.avgCostPrice ?? product.costPrice ?? 0,
        location: dto.location,
      });
      const saved = await manager.save(stock);

      // Mouvement initial si quantité > 0
      if ((dto.quantity ?? 0) > 0) {
        await manager.save(
          manager.create(StockMovement, {
            stockId: saved.id,
            type: MovementType.INITIAL,
            reason: MovementReason.MANUAL,
            quantity: dto.quantity,
            quantityBefore: 0,
            quantityAfter: dto.quantity,
            unitCost: dto.avgCostPrice ?? product.costPrice ?? 0,
            occurredAt: new Date(),
          }),
        );
      }
      this.logger.log(`Stock créé pour produit ${product.sku} (qté: ${dto.quantity ?? 0})`);
      return saved;
    });
  }

  async findAllStocks(query: QueryStockDto): Promise<PaginatedResult<Stock>> {
    const qb = this.stockRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.product', 'product')
      .leftJoinAndSelect('product.category', 'category');

    if (query.outOfStock) {
      qb.andWhere('s.quantity <= 0');
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('product.sku ILIKE :q', { q: `%${query.search}%` })
            .orWhere('product.name ILIKE :q', { q: `%${query.search}%` })
            .orWhere('product.brand ILIKE :q', { q: `%${query.search}%` })
            .orWhere('s.location ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }

    const result = await paginate(qb, query);

    // Filtre alertes côté applicatif (après pagination pour préserver la cohérence)
    if (query.alertOnly) {
      result.items = result.items.filter(
        (s) => s.alertLevel !== StockAlertLevel.OK,
      );
    }
    return result;
  }

  async findOneStock(id: string): Promise<Stock> {
    const s = await this.stockRepo.findOne({
      where: { id },
      relations: ['product', 'product.category'],
    });
    if (!s) throw new NotFoundException(`Stock ${id} introuvable`);
    return s;
  }

  async findStockByProduct(productId: string): Promise<Stock> {
    const s = await this.stockRepo.findOne({
      where: { productId },
      relations: ['product'],
    });
    if (!s) throw new NotFoundException(`Aucun stock pour le produit ${productId}`);
    return s;
  }

  async updateStock(id: string, dto: UpdateStockDto): Promise<Stock> {
    const stock = await this.findOneStock(id);
    Object.assign(stock, dto);
    return this.stockRepo.save(stock);
  }

  /** Retourne le stock existant ou en crée un vide (pour la réception fournisseur) */
  async findOrCreateStock(productId: string, createdById: string): Promise<Stock> {
    const existing = await this.stockRepo.findOne({ where: { productId } });
    if (existing) return existing;

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Produit ${productId} introuvable`);

    const stock = this.stockRepo.create({
      productId,
      quantity: 0,
      reservedQuantity: 0,
      minQuantity: 0,
      reorderQuantity: 0,
      maxQuantity: 0,
      avgCostPrice: product.costPrice ?? 0,
    });
    return this.stockRepo.save(stock);
  }

  // ─────────────────────────────────────────────────────────────
  // MOUVEMENTS — entrée / sortie / ajustement
  // ─────────────────────────────────────────────────────────────
  async addMovement(
    dto: CreateMovementDto,
    createdById: string,
  ): Promise<StockMovement> {
    return this.dataSource.transaction(async (manager) => {
      // Verrouillage pessimiste pour éviter les race conditions
      const stock = await manager
        .createQueryBuilder(Stock, 's')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: dto.stockId })
        .getOne();
      if (!stock) throw new NotFoundException(`Stock ${dto.stockId} introuvable`);

      const qty = Number(dto.quantity);
      const before = Number(stock.quantity);
      let after: number;

      if (dto.type === MovementType.IN || dto.type === MovementType.RETURN || dto.type === MovementType.INITIAL) {
        after = before + qty;
        // Mise à jour du PUMP (prix unitaire moyen pondéré)
        if (dto.unitCost && dto.unitCost > 0 && after > 0) {
          stock.avgCostPrice =
            (before * Number(stock.avgCostPrice) + qty * dto.unitCost) / after;
        }
      } else if (dto.type === MovementType.OUT || dto.type === MovementType.LOSS || dto.type === MovementType.TRANSFER) {
        if (before < qty) {
          throw new BadRequestException(
            `Stock insuffisant : disponible ${before}, demandé ${qty}`,
          );
        }
        after = before - qty;
      } else if (dto.type === MovementType.ADJUSTMENT) {
        after = qty; // qty = nouvelle valeur absolue
      } else {
        after = before + qty;
      }

      stock.quantity = after;
      if (stock.quantity < 0) stock.quantity = 0;
      await manager.save(stock);

      const movement = manager.create(StockMovement, {
        stockId: dto.stockId,
        type: dto.type,
        reason: dto.reason ?? MovementReason.MANUAL,
        quantity: qty,
        quantityBefore: before,
        quantityAfter: after,
        unitCost: dto.unitCost ?? stock.avgCostPrice,
        notes: dto.notes,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdById,
      });
      const saved = await manager.save(movement);

      this.logger.log(
        `Mouvement ${dto.type} — stock ${dto.stockId} : ${before} → ${after}`,
      );
      return saved;
    });
  }

  async adjustStock(
    stockId: string,
    dto: AdjustStockDto,
    createdById: string,
  ): Promise<StockMovement> {
    const stock = await this.findOneStock(stockId);
    const diff = dto.newQuantity - Number(stock.quantity);
    const type = diff >= 0 ? MovementType.IN : MovementType.OUT;

    return this.addMovement(
      {
        stockId,
        type: MovementType.ADJUSTMENT,
        reason: MovementReason.INVENTORY_COUNT,
        quantity: dto.newQuantity,
        notes: dto.notes ?? `Ajustement inventaire : ${stock.quantity} → ${dto.newQuantity}`,
        occurredAt: new Date().toISOString(),
      },
      createdById,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // HISTORIQUE DES MOUVEMENTS
  // ─────────────────────────────────────────────────────────────
  async findMovements(
    stockId: string,
    query: QueryMovementsDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const stock = await this.findOneStock(stockId);
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.createdBy', 'createdBy')
      .where('m.stockId = :stockId', { stockId });
    return paginate(qb, query);
  }

  // ─────────────────────────────────────────────────────────────
  // ALERTES & RAPPORTS
  // ─────────────────────────────────────────────────────────────
  async getAlerts(): Promise<{
    outOfStock: Stock[];
    critical: Stock[];
    warning: Stock[];
  }> {
    const stocks = await this.stockRepo.find({
      relations: ['product'],
      where: {},
    });

    const result = { outOfStock: [], critical: [], warning: [] };
    for (const s of stocks) {
      const level = s.alertLevel;
      if (level === StockAlertLevel.OUT) result.outOfStock.push(s);
      else if (level === StockAlertLevel.CRITICAL) result.critical.push(s);
      else if (level === StockAlertLevel.WARNING) result.warning.push(s);
    }
    return result;
  }

  async getValuation(): Promise<{
    totalValue: number;
    itemCount: number;
    byProduct: Array<{ sku: string; name: string; quantity: number; value: number }>;
  }> {
    const stocks = await this.stockRepo.find({
      relations: ['product'],
    });

    const byProduct = stocks
      .filter((s) => Number(s.quantity) > 0)
      .map((s) => ({
        sku: s.product?.sku ?? '?',
        name: s.product?.name ?? '?',
        quantity: Number(s.quantity),
        value: s.totalValue,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalValue: Math.round(byProduct.reduce((acc, r) => acc + r.value, 0) * 100) / 100,
      itemCount: byProduct.length,
      byProduct,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITAIRE — appelé par le module Sales
  // ─────────────────────────────────────────────────────────────
  async reserveStock(productId: string, quantity: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stock = await manager
        .createQueryBuilder(Stock, 's')
        .setLock('pessimistic_write')
        .where('s.productId = :pid', { pid: productId })
        .getOne();
      if (!stock) throw new NotFoundException(`Aucun stock pour le produit ${productId}`);
      if (stock.availableQuantity < quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour la réservation : disponible ${stock.availableQuantity}`,
        );
      }
      stock.reservedQuantity = Number(stock.reservedQuantity) + quantity;
      await manager.save(stock);
    });
  }

  async releaseReservation(productId: string, quantity: number): Promise<void> {
    const stock = await this.stockRepo.findOne({ where: { productId } });
    if (!stock) return;
    stock.reservedQuantity = Math.max(0, Number(stock.reservedQuantity) - quantity);
    await this.stockRepo.save(stock);
  }
}
