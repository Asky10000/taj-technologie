import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Category } from './category.entity';
import {
  ProductType,
  ProductStatus,
  PriceType,
  StockPolicy,
} from '../enums/product.enums';

@Entity({ name: 'products' })
@Index('idx_products_sku', ['sku'], { unique: true })
@Index('idx_products_type', ['type'])
@Index('idx_products_status', ['status'])
@Index('idx_products_category', ['categoryId'])
export class Product extends BaseEntity {
  @ApiProperty({ example: 'PRD-2024-HP-001' })
  @Column({ type: 'varchar', length: 60, unique: true })
  sku: string;

  @ApiProperty({ example: 'HP LaserJet Pro M404n' })
  @Column({ type: 'varchar', length: 250 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ required: false, description: 'Description courte pour les listes' })
  @Column({ name: 'short_description', type: 'varchar', length: 500, nullable: true })
  shortDescription?: string;

  @ApiProperty({ enum: ProductType })
  @Column({ type: 'enum', enum: ProductType, default: ProductType.HARDWARE })
  type: ProductType;

  @ApiProperty({ enum: ProductStatus })
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ enum: PriceType })
  @Column({
    name: 'price_type',
    type: 'enum',
    enum: PriceType,
    default: PriceType.FIXED,
  })
  priceType: PriceType;

  @ApiProperty({ description: 'Prix de vente HT' })
  @Column({
    name: 'selling_price',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  sellingPrice: number;

  @ApiProperty({ description: 'Prix d\'achat HT (coût)' })
  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  costPrice: number;

  @ApiProperty({ description: 'Taux de TVA (%)', example: 20 })
  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 20,
  })
  taxRate: number;

  @ApiProperty({ description: 'Prix de vente TTC (calculé)' })
  get priceWithTax(): number {
    return Math.round(this.sellingPrice * (1 + this.taxRate / 100) * 100) / 100;
  }

  @ApiProperty({ description: 'Marge brute (%)', required: false })
  get marginPercent(): number | null {
    if (!this.costPrice || this.costPrice === 0) return null;
    return (
      Math.round(
        ((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100 * 100,
      ) / 100
    );
  }

  @ApiProperty({ enum: StockPolicy })
  @Column({
    name: 'stock_policy',
    type: 'enum',
    enum: StockPolicy,
    default: StockPolicy.UNTRACKED,
  })
  stockPolicy: StockPolicy;

  @ApiProperty({ required: false, description: 'Référence fabricant / marque' })
  @Column({ name: 'brand', type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'model', type: 'varchar', length: 150, nullable: true })
  model?: string;

  @ApiProperty({ required: false, description: 'Code barre EAN/UPC' })
  @Column({ name: 'barcode', type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  @ApiProperty({ required: false, description: 'Unité de mesure (pièce, heure, jour…)' })
  @Column({ name: 'unit', type: 'varchar', length: 30, default: 'pièce' })
  unit: string;

  @ApiProperty({ required: false, description: 'Poids en kg' })
  @Column({
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
  })
  weight?: number;

  @ApiProperty({ isArray: true, type: String, required: false })
  @Column({ name: 'image_urls', type: 'text', array: true, default: () => "'{}'" })
  imageUrls: string[];

  @ApiProperty({ isArray: true, type: String, required: false })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @ApiProperty({ required: false, description: 'Garantie en mois' })
  @Column({
    name: 'warranty_months',
    type: 'int',
    nullable: true,
  })
  warrantyMonths?: number;

  @ApiProperty({ required: false, description: 'Caractéristiques techniques (JSON libre)' })
  @Column({ type: 'jsonb', nullable: true })
  specifications?: Record<string, unknown>;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @BeforeInsert()
  generateSkuIfMissing(): void {
    if (!this.sku) {
      const y = new Date().getFullYear();
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      this.sku = `PRD-${y}-${rand}`;
    }
  }

  @BeforeUpdate()
  @BeforeInsert()
  setStockPolicy(): void {
    if (
      this.type === ProductType.SERVICE ||
      this.type === ProductType.SUBSCRIPTION ||
      this.type === ProductType.SOFTWARE
    ) {
      this.stockPolicy = StockPolicy.UNTRACKED;
    } else {
      // Produits physiques (HARDWARE, CONSUMABLE, etc.) → toujours TRACKED
      this.stockPolicy = StockPolicy.TRACKED;
    }
  }
}
