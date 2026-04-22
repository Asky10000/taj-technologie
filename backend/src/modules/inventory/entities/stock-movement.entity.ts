import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Stock } from './stock.entity';
import { MovementType, MovementReason } from '../enums/inventory.enums';

@Entity({ name: 'stock_movements' })
@Index('idx_movements_stock', ['stockId'])
@Index('idx_movements_type', ['type'])
@Index('idx_movements_occurred_at', ['occurredAt'])
@Index('idx_movements_reference', ['referenceType', 'referenceId'])
export class StockMovement extends BaseEntity {
  @Column({ name: 'stock_id', type: 'uuid' })
  stockId: string;

  @ManyToOne(() => Stock, (s) => s.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_id' })
  stock: Stock;

  @ApiProperty({ enum: MovementType })
  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @ApiProperty({ enum: MovementReason })
  @Column({ type: 'enum', enum: MovementReason, default: MovementReason.MANUAL })
  reason: MovementReason;

  @ApiProperty({ description: 'Quantité déplacée (toujours positive)' })
  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Stock avant mouvement' })
  @Column({ name: 'quantity_before', type: 'numeric', precision: 14, scale: 3 })
  quantityBefore: number;

  @ApiProperty({ description: 'Stock après mouvement' })
  @Column({ name: 'quantity_after', type: 'numeric', precision: 14, scale: 3 })
  quantityAfter: number;

  @ApiProperty({ description: 'Prix unitaire au moment du mouvement' })
  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 4, default: 0 })
  unitCost: number;

  @ApiProperty({ description: 'Valeur totale du mouvement = quantity × unitCost' })
  get totalCost(): number {
    return Math.round(Number(this.quantity) * Number(this.unitCost) * 100) / 100;
  }

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Date effective du mouvement' })
  @Column({ name: 'occurred_at', type: 'timestamp with time zone' })
  occurredAt: Date;

  @ApiProperty({ required: false, description: 'Type de document source (PURCHASE_ORDER, SALE_ORDER…)' })
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string;

  @ApiProperty({ required: false, description: 'UUID du document source' })
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}
