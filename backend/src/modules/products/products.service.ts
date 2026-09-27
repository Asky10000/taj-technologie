import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ProductStatus, StockPolicy } from './enums/product.enums';
import { paginate } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CATEGORIES
  // ─────────────────────────────────────────────────────────────
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? this.slugify(dto.name);
    const exists = await this.categoryRepo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" déjà utilisé`);

    const category = this.categoryRepo.create({ ...dto, slug });
    return this.categoryRepo.save(category);
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['parent', 'children'],
    });
  }

  async findOneCategory(id: string): Promise<Category> {
    const c = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!c) throw new NotFoundException(`Catégorie ${id} introuvable`);
    return c;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOneCategory(id);
    if (dto.slug && dto.slug !== category.slug) {
      const clash = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);
    }
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.findOneCategory(id);
    await this.categoryRepo.softRemove(category);
  }

  // ─────────────────────────────────────────────────────────────
  // PRODUCTS
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto): Promise<Product> {
    if (dto.sku) {
      const exists = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException(`SKU "${dto.sku}" déjà utilisé`);
    }
    const product = this.productRepo.create({
      ...dto,
      imageUrls: dto.imageUrls ?? [],
      tags: dto.tags ?? [],
      taxRate: dto.taxRate ?? 20,
      costPrice: dto.costPrice ?? 0,
      unit: dto.unit ?? 'pièce',
    });
    const saved = await this.productRepo.save(product);
    this.logger.log(`Produit créé : ${saved.sku} — ${saved.name}`);
    return saved;
  }

  async findAll(query: QueryProductsDto): Promise<PaginatedResult<Product>> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category');

    if (query.type) qb.andWhere('p.type = :type', { type: query.type });
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.categoryId) qb.andWhere('p.categoryId = :cid', { cid: query.categoryId });
    if (query.brand) qb.andWhere('p.brand ILIKE :brand', { brand: `%${query.brand}%` });
    if (query.minPrice !== undefined)
      qb.andWhere('p.sellingPrice >= :min', { min: query.minPrice });
    if (query.maxPrice !== undefined)
      qb.andWhere('p.sellingPrice <= :max', { max: query.maxPrice });
    if (query.tracked !== undefined) {
      qb.andWhere('p.stockPolicy = :sp', {
        sp: query.tracked ? StockPolicy.TRACKED : StockPolicy.UNTRACKED,
      });
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('p.sku ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.name ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.brand ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.model ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.barcode ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Product> {
    const p = await this.productRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!p) throw new NotFoundException(`Produit ${id} introuvable`);
    return p;
  }

  async findBySku(sku: string): Promise<Product> {
    const p = await this.productRepo.findOne({ where: { sku } });
    if (!p) throw new NotFoundException(`Produit SKU "${sku}" introuvable`);
    return p;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (dto.sku && dto.sku !== product.sku) {
      const clash = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (clash) throw new ConflictException(`SKU "${dto.sku}" déjà utilisé`);
    }
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    const product = await this.findOne(id);
    product.status = status;
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepo.softRemove(product);
    this.logger.log(`Produit ${product.sku} supprimé (soft)`);
  }

  async restore(id: string): Promise<Product> {
    const p = await this.productRepo.findOne({ where: { id }, withDeleted: true });
    if (!p) throw new NotFoundException(`Produit ${id} introuvable`);
    await this.productRepo.restore(id);
    return this.findOne(id);
  }

  // ─────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────
  async countByType(): Promise<Record<string, number>> {
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .select('p.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.type')
      .getRawMany<{ type: string; count: string }>();

    const result: Record<string, number> = {};
    rows.forEach((r) => (result[r.type] = parseInt(r.count, 10)));
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER
  // ─────────────────────────────────────────────────────────────
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
