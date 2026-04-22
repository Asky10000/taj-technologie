import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { StockAlertLevel } from '../enums/inventory.enums';
import { StockMovement } from './stock-movement.entity';

@Entity({ name: 'stocks' })
@Index('idx_stocks_product', ['productId'], { unique: true })
export class Stock extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid', unique: true })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({ description: 'Quantité disponible actuelle' })
  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  quantity: number;

  @ApiProperty({ description: 'Quantité réservée (commandes en attente)' })
  @Column({ name: 'reserved_quantity', type: 'numeric', precision: 14, scale: 3, default: 0 })
  reservedQuantity: number;

  @ApiProperty({ description: 'Quantité disponible réelle = quantity - reservedQuantity' })
  get availableQuantity(): number {
    return Math.max(0, Number(this.quantity) - Number(this.reservedQuantity));
  }

  @ApiProperty({ description: 'Seuil d\'alerte minimum' })
  @Column({ name: 'min_quantity', type: 'numeric', precision: 14, scale: 3, default: 0 })
  minQuantity: number;

  @ApiProperty({ description: 'Seuil de réapprovisionnement (quantité à commander)' })
  @Column({ name: 'reorder_quantity', type: 'numeric', precision: 14, scale: 3, default: 0 })
  reorderQuantity: number;

  @ApiProperty({ description: 'Stock maximum autorisé (0 = illimité)' })
  @Column({ name: 'max_quantity', type: 'numeric', precision: 14, scale: 3, default: 0 })
  maxQuantity: number;

  @ApiProperty({ description: 'Prix de revient unitaire moyen pondéré (PUMP)' })
  @Column({ name: 'avg_cost_price', type: 'numeric', precision: 14, scale: 4, default: 0 })
  avgCostPrice: number;

  @ApiProperty({ description: 'Valeur totale du stock = quantity × avgCostPrice' })
  get totalValue(): number {
    return Math.round(Number(this.quantity) * Number(this.avgCostPrice) * 100) / 100;
  }

  @ApiProperty({ enum: StockAlertLevel })
  get alertLevel(): StockAlertLevel {
    const qty = Number(this.quantity);
    const min = Number(this.minQuantity);

    if (qty <= 0) return StockAlertLevel.OUT;
    if (min > 0 && qty <= min * 0.2) return StockAlertLevel.CRITICAL;
    if (min > 0 && qty <= min) return StockAlertLevel.WARNING;
    return StockAlertLevel.OK;
  }

  @ApiProperty({ required: false, description: 'Emplacement physique' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'last_counted_at', type: 'timestamp with time zone', nullable: true })
  lastCountedAt?: Date;

  @OneToMany(() => StockMovement, (m) => m.stock)
  movements: StockMovement[];
}
